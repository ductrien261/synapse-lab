"""Kiểm thử trình đọc thư viện AnatomyTOOL (không cần mạng, không cần DB)."""

from django.test import SimpleTestCase

from .services.anatomytool import node_url, parse_library_page

HTML = '''
<div class="items">
  <div class="item"><a class="embed-responsive itemWrapper" ng-click="$event.preventDefault(); clickDataItem(63977);"
     style="background-image:url(https://anatomytool.org/files/thumb-a.PNG);" title="Open3DModel - Spinal cord - English labels">
     <div class="title">Open3DModel - Spinal cord...</div></a></div>
  <div class="item"><a class="itemWrapper" ng-click="clickDataItem(63935);" style="" title="">
     <div class="title">Brachial plexus video</div></a></div>
  <div class="item"><a class="itemWrapper" ng-click="clickDataItem(63977);" title="dup"></a></div>
</div>
<ul class="pager"><a href="/interactive?page=1">2</a><a href="/interactive?page=9">last</a><a href="/videos?page=40">x</a></ul>
'''


class LibraryParserTests(SimpleTestCase):
    def test_items_and_last_page(self):
        items, last = parse_library_page(HTML)
        self.assertEqual([i.nid for i in items], ['63977', '63935'])
        self.assertEqual(items[0].title, 'Open3DModel - Spinal cord - English labels')
        self.assertEqual(items[0].thumbnail_url, 'https://anatomytool.org/files/thumb-a.PNG')
        self.assertEqual(items[1].title, 'Brachial plexus video')  # không có title -> lấy chữ trong thẻ
        self.assertEqual(last, 9)  # bỏ qua phân trang của trang khác

    def test_node_url(self):
        self.assertEqual(node_url('63977'), 'https://anatomytool.org/node/63977')
