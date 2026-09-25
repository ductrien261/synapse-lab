"""Kiểm thử quy tắc không cần DB: chọn dạng câu theo mức nắm vững, khóa gộp hiểu nhầm."""

from django.test import SimpleTestCase

from anatomy.models import Structure

from .services import INTERVALS, _mis_key, choose_kind


class RuleTests(SimpleTestCase):
    def test_kind_by_box(self):
        s = Structure(name_en='Left ventricle', clinical_note='')
        self.assertEqual(choose_kind(0, True, s, attempts=0), 'identify')  # mới: nhận diện trên 3D
        self.assertIn(choose_kind(1, False, s, attempts=3), ('mcq',))
        self.assertEqual(choose_kind(3, True, s, attempts=5), 'mcq')  # không có lâm sàng -> không ra tình huống
        self.assertEqual(choose_kind(5, True, s, attempts=9), 'short')

    def test_intervals_grow(self):
        self.assertTrue(all(a < b for a, b in zip(INTERVALS, INTERVALS[1:])))

    def test_misconception_key_normalized(self):
        self.assertEqual(_mis_key(1, 'Nhầm  van hai lá với van ba lá'), _mis_key(1, 'nhầm van hai lá với van ba lá '))
        self.assertNotEqual(_mis_key(1, 'x y z'), _mis_key(2, 'x y z'))
