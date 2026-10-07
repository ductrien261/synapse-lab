"""Source preview parsing without network or database access."""

import unittest
from unittest.mock import MagicMock, patch

from algorithms.services.source_fetch import _visualizer_pseudocode, extract_topics, fetch_source_text


class SourceFetchPreviewTests(unittest.TestCase):
    @patch('algorithms.services.source_fetch._validate_url', side_effect=lambda url, domain: url)
    @patch('algorithms.services.source_fetch.requests.Session')
    def test_html_headings_and_declared_utf8_are_preserved(self, session_class, _validate):
        html = (
            '<html><head><meta charset="utf-8"><title>Algorithms</title></head><body>'
            '<h2>Sample Algorithms by Problem</h2><h5>Kruskal’s Algorithm</h5>'
            '<p>' + 'Kruskal’s algorithm selects edges for a minimum spanning tree. ' * 4 + '</p>'
            '</body></html>'
        ).encode('utf-8')
        response = MagicMock()
        response.is_redirect = False
        response.ok = True
        response.headers = {'content-type': 'text/html'}
        response.encoding = 'ISO-8859-1'  # Requests' default when the header omits a charset.
        response.iter_content.return_value = [html]
        session_class.return_value.get.return_value = response

        result = fetch_source_text('https://example.test/algorithms', 'example.test')

        self.assertEqual(result['title'], 'Algorithms')
        self.assertEqual(result['headings'], [
            {'level': 2, 'title': 'Sample Algorithms by Problem'},
            {'level': 5, 'title': 'Kruskal’s Algorithm'},
        ])
        self.assertEqual(result['topics'], ['Kruskal’s Algorithm'])
        self.assertIn('Kruskal’s algorithm', result['content'])
        self.assertNotIn('Kruskalâ', result['content'])

    def test_multi_topic_page_uses_leaf_sections_and_skips_scaffolding(self):
        headings = [
            {'level': 2, 'title': 'Sample Algorithms by Problem'},
            {'level': 3, 'title': 'Data Structure Problems'},
            {'level': 4, 'title': 'Searching'},
            {'level': 5, 'title': 'Sequential Search Algorithm'},
            {'level': 5, 'title': 'Binary Search Algorithm'},
            {'level': 4, 'title': 'Sorting'},
            {'level': 5, 'title': 'Merge Sort Algorithm'},
        ]
        self.assertEqual(extract_topics(headings, 'Sample Algorithms by Problem | Example'), [
            'Sequential Search Algorithm', 'Binary Search Algorithm', 'Merge Sort Algorithm',
        ])

    def test_single_algorithm_page_falls_back_to_its_title(self):
        headings = [
            {'level': 2, 'title': 'Binary Search'},
            {'level': 3, 'title': 'Overview'},
            {'level': 3, 'title': 'Complexity'},
        ]
        self.assertEqual(extract_topics(headings, 'Binary Search - Example Site'), ['Binary Search'])

    @patch('algorithms.services.source_fetch.requests.get')
    def test_visualizer_pseudocode_is_read_from_public_source(self, get):
        response = MagicMock()
        response.text = 'pseudoCode: [\n  "procedure binarySearch(arr)",\n  "  return arr[0]",\n],\n});'
        response.content = response.text.encode()
        get.return_value = response

        text, url = _visualizer_pseudocode(
            'https://algorithm-visualizer.seancoughlin.me/searching/binarySearch',
        )

        self.assertEqual(text, 'procedure binarySearch(arr)\n  return arr[0]')
        self.assertIn('binarySearch.ts', url)
        self.assertEqual(_visualizer_pseudocode('https://example.test/searching/binarySearch'), ('', ''))

    @patch('algorithms.services.source_fetch._visualizer_pseudocode')
    @patch('algorithms.services.source_fetch._validate_url', side_effect=lambda url, domain: url)
    @patch('algorithms.services.source_fetch.requests.Session')
    def test_client_rendered_page_includes_pseudocode_in_preview(self, session_class, _validate, pseudocode):
        html = (
            '<html><head><title>Binary Search | Algorithm Visualizer</title></head><body>'
            '<h1>Binary Search</h1><p>Efficient search for a sorted collection.</p>'
            '<p>Loading visualization...</p>' + '<p>More details about binary search. ' * 8 + '</p>'
            '</body></html>'
        ).encode()
        response = MagicMock(is_redirect=False, ok=True, headers={'content-type': 'text/html'})
        response.iter_content.return_value = [html]
        session_class.return_value.get.return_value = response
        pseudocode.return_value = ('procedure binarySearch(arr)\n  return -1', 'https://example.test/code.ts')

        result = fetch_source_text(
            'https://algorithm-visualizer.seancoughlin.me/searching/binarySearch',
            'algorithm-visualizer.seancoughlin.me',
        )

        self.assertIn('procedure binarySearch(arr)', result['content'])
        self.assertEqual(result['pseudocode'], 'procedure binarySearch(arr)\n  return -1')
        self.assertEqual(result['code_source_url'], 'https://example.test/code.ts')


if __name__ == '__main__':
    unittest.main()
