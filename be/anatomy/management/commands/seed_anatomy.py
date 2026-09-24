from django.core.management.base import BaseCommand
from anatomy.models import BodySystem

# Phân loại theo hệ cơ quan (Terminologia Anatomica)
SYSTEMS = [
    ('cardiovascular', 'Hệ tuần hoàn', 'Cardiovascular system', '#E11D48'),
    ('nervous', 'Hệ thần kinh', 'Nervous system', '#7C3AED'),
    ('respiratory', 'Hệ hô hấp', 'Respiratory system', '#0284C7'),
    ('musculoskeletal', 'Hệ cơ xương khớp', 'Musculoskeletal system', '#D97706'),
    ('digestive', 'Hệ tiêu hóa', 'Digestive system', '#059669'),
    ('urinary', 'Hệ tiết niệu', 'Urinary system', '#0D9488'),
    ('reproductive', 'Hệ sinh dục', 'Reproductive system', '#DB2777'),
    ('endocrine', 'Hệ nội tiết', 'Endocrine system', '#9333EA'),
    ('lymphatic', 'Hệ bạch huyết – miễn dịch', 'Lymphatic system', '#65A30D'),
    ('integumentary', 'Hệ da', 'Integumentary system', '#B45309'),
    ('sensory', 'Giác quan', 'Special senses', '#2563EB'),
]

class Command(BaseCommand):
    help = 'Tạo danh sách hệ cơ quan chuẩn (chạy lại nhiều lần không bị trùng).'

    def handle(self, *args, **options):
        for order, (slug, name_vi, name_en, color) in enumerate(SYSTEMS):
            BodySystem.objects.update_or_create(
                slug=slug, defaults={'name_vi': name_vi, 'name_en': name_en, 'color': color, 'order': order}
            )
        self.stdout.write(self.style.SUCCESS(f'Hệ cơ quan: {len(SYSTEMS)}'))
