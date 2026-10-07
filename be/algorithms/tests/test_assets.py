from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from algorithms.services.assets import resolve_block_images


class LessonAssetResolutionTests(SimpleTestCase):
    @override_settings(LESSON_ASSETS_ON_S3=True)
    @patch('algorithms.services.assets.lesson_asset_storage')
    def test_algorithm_diagrams_remain_local(self, storage):
        blocks = [{'image': '/lesson-assets/algorithms/backtracking/queens.svg'}]

        self.assertEqual(resolve_block_images(blocks), blocks)
        storage.assert_not_called()

    @override_settings(LESSON_ASSETS_ON_S3=True)
    @patch('algorithms.services.assets.lesson_asset_storage')
    def test_textbook_images_still_use_storage(self, storage):
        storage.return_value.url.return_value = 'https://assets.example.test/figure.webp'

        blocks = resolve_block_images([{'image': '/lesson-assets/openstax/figure.webp'}])

        self.assertEqual(blocks[0]['image_url'], 'https://assets.example.test/figure.webp')
        storage.return_value.url.assert_called_once_with('lesson-assets/openstax/figure.webp')
