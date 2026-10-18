from __future__ import annotations

import io
import shutil
import subprocess
import tempfile
from pathlib import Path

import pymupdf as fitz
from PIL import Image
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from .models import LessonResource


class DocumentRenderingError(RuntimeError):
    """Raised when an uploaded teaching document cannot be rendered."""


def cleanup_lesson_resource_preview(resource: LessonResource) -> None:
    """Remove generated artifacts without touching the teacher's original upload."""
    if resource.preview_pdf:
        resource.preview_pdf.delete(save=False)
    for storage_name in resource.preview_slides or []:
        if storage_name and default_storage.exists(storage_name):
            default_storage.delete(storage_name)


def cleanup_lesson_resource_files(resource: LessonResource) -> None:
    cleanup_lesson_resource_preview(resource)
    if resource.file:
        resource.file.delete(save=False)


def render_lesson_resource_preview(resource: LessonResource) -> LessonResource:
    """Convert one PPTX to a PDF and immutable WebP images for the slide viewer."""
    if resource.kind != LessonResource.Kind.SLIDE or not resource.file:
        cleanup_lesson_resource_preview(resource)
        resource.preview_pdf = ''
        resource.preview_slides = []
        resource.preview_status = LessonResource.PreviewStatus.NONE
        resource.preview_error = ''
        resource.preview_page_count = 0
        resource.save(update_fields=[
            'preview_pdf', 'preview_slides', 'preview_status', 'preview_error',
            'preview_page_count', 'updated_at',
        ])
        return resource

    if Path(resource.file.name).suffix.lower() != '.pptx':
        return _mark_failed(resource, 'Chỉ hỗ trợ render tệp PowerPoint định dạng .pptx.')

    cleanup_lesson_resource_preview(resource)
    resource.preview_pdf = ''
    resource.preview_slides = []
    resource.preview_status = LessonResource.PreviewStatus.PROCESSING
    resource.preview_error = ''
    resource.preview_page_count = 0
    resource.save(update_fields=[
        'preview_pdf', 'preview_slides', 'preview_status', 'preview_error',
        'preview_page_count', 'updated_at',
    ])

    generated_slide_names: list[str] = []
    try:
        office_binary = shutil.which('libreoffice') or shutil.which('soffice')
        if not office_binary:
            raise DocumentRenderingError('Máy chủ chưa cài LibreOffice rendering service.')

        with tempfile.TemporaryDirectory(prefix='synapse-pptx-') as temp_dir_name:
            temp_dir = Path(temp_dir_name)
            source_path = temp_dir / 'source.pptx'
            output_dir = temp_dir / 'output'
            profile_dir = temp_dir / 'libreoffice-profile'
            output_dir.mkdir()
            profile_dir.mkdir()

            with resource.file.open('rb') as uploaded_file, source_path.open('wb') as local_file:
                shutil.copyfileobj(uploaded_file, local_file)

            result = subprocess.run(
                [
                    office_binary,
                    f'-env:UserInstallation={profile_dir.as_uri()}',
                    '--headless',
                    '--nologo',
                    '--nodefault',
                    '--nolockcheck',
                    '--norestore',
                    '--convert-to',
                    'pdf:impress_pdf_Export',
                    '--outdir',
                    str(output_dir),
                    str(source_path),
                ],
                capture_output=True,
                text=True,
                timeout=180,
                check=False,
            )
            pdf_path = output_dir / 'source.pdf'
            if result.returncode != 0 or not pdf_path.exists() or pdf_path.stat().st_size == 0:
                detail = (result.stderr or result.stdout or 'LibreOffice không tạo được PDF.').strip()
                raise DocumentRenderingError(detail[-1000:])

            pdf_bytes = pdf_path.read_bytes()
            resource.preview_pdf.save('slides.pdf', ContentFile(pdf_bytes), save=False)

            with fitz.open(stream=pdf_bytes, filetype='pdf') as document:
                if document.page_count == 0:
                    raise DocumentRenderingError('PowerPoint không có slide để hiển thị.')
                for page_index, page in enumerate(document):
                    scale = min(2.5, max(1.0, 1920 / page.rect.width))
                    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                    image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
                    image_buffer = io.BytesIO()
                    image.save(image_buffer, format='WEBP', quality=90, method=6)
                    storage_path = (
                        f'classrooms/{resource.section.plan.classroom.code}/lesson-resources/'
                        f'{resource.id}/preview/slide-{page_index + 1:04d}.webp'
                    )
                    generated_slide_names.append(
                        default_storage.save(storage_path, ContentFile(image_buffer.getvalue()))
                    )

        resource.preview_slides = generated_slide_names
        resource.preview_status = LessonResource.PreviewStatus.READY
        resource.preview_error = ''
        resource.preview_page_count = len(generated_slide_names)
        resource.save(update_fields=[
            'preview_pdf', 'preview_slides', 'preview_status', 'preview_error',
            'preview_page_count', 'updated_at',
        ])
        return resource
    except Exception as exc:
        for storage_name in generated_slide_names:
            if default_storage.exists(storage_name):
                default_storage.delete(storage_name)
        if resource.preview_pdf:
            resource.preview_pdf.delete(save=False)
        return _mark_failed(resource, str(exc))


def _mark_failed(resource: LessonResource, message: str) -> LessonResource:
    resource.preview_pdf = ''
    resource.preview_slides = []
    resource.preview_status = LessonResource.PreviewStatus.FAILED
    resource.preview_error = (message or 'Không thể render PowerPoint.').strip()[:1000]
    resource.preview_page_count = 0
    resource.save(update_fields=[
        'preview_pdf', 'preview_slides', 'preview_status', 'preview_error',
        'preview_page_count', 'updated_at',
    ])
    return resource
