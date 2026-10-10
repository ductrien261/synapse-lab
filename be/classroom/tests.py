import jwt
import pymupdf as fitz
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from users.models import User
from anatomy.models import AnatomyModel, BodySystem

from .models import (
    ClassMembership,
    Classroom,
    LessonPlan,
    LessonQuiz,
    LessonResource,
    LessonSection,
    LiveSession,
    SessionAttendance,
)


def make_test_pdf_bytes(text='Synapse PDF', page_count=1):
    with fitz.open() as document:
        for _ in range(page_count):
            page = document.new_page()
            page.insert_text((72, 72), text)
        return document.tobytes()


class ClassroomApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='test-password')
        self.member = User.objects.create_user(email='member@example.com', password='test-password')

    def test_create_classroom_also_creates_owner_membership(self):
        self.client.force_authenticate(self.owner)

        response = self.client.post(reverse('classroom-list-create'), {
            'name': 'Ôn tập BFS',
            'purpose': Classroom.Purpose.GROUP,
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        classroom = Classroom.objects.get()
        membership = ClassMembership.objects.get(classroom=classroom, user=self.owner)
        self.assertEqual(membership.role, ClassMembership.Role.OWNER)
        self.assertEqual(response.data['member_count'], 1)

    def test_join_classroom_by_code_is_idempotent(self):
        classroom = Classroom.objects.create(name='Giải phẫu', owner=self.owner)
        ClassMembership.objects.create(
            classroom=classroom,
            user=self.owner,
            role=ClassMembership.Role.OWNER,
        )
        self.client.force_authenticate(self.member)

        first = self.client.post(reverse('classroom-join'), {'code': classroom.code.lower()})
        second = self.client.post(reverse('classroom-join'), {'code': classroom.code})

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(ClassMembership.objects.filter(classroom=classroom, user=self.member).count(), 1)

    def test_member_sees_total_membership_count(self):
        classroom = Classroom.objects.create(name='Lớp có hai thành viên', owner=self.owner)
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        self.client.force_authenticate(self.member)

        response = self.client.get(reverse('classroom-list-create'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['member_count'], 2)

    @override_settings(LIVEKIT_API_KEY='test-key', LIVEKIT_API_SECRET='test-secret')
    @patch('classroom.views.delete_room')
    def test_livekit_session_lifecycle_and_permissions(self, delete_room):
        classroom = Classroom.objects.create(name='Học nhóm', owner=self.owner)
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])

        self.client.force_authenticate(self.member)
        forbidden = self.client.post(reverse('session-start', kwargs={'code': classroom.code}), {})
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.owner)
        started = self.client.post(reverse('session-start', kwargs={'code': classroom.code}), {})
        self.assertEqual(started.status_code, status.HTTP_201_CREATED)
        self.assertEqual(started.data['active_session']['mode'], 'livekit')
        session = LiveSession.objects.get()
        self.assertTrue(session.room_name.startswith('synapse-'))

        token_url = reverse('session-video-token', kwargs={'code': classroom.code})
        self.assertEqual(self.client.get(token_url).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.member)
        joined = self.client.post(reverse('session-join', kwargs={'code': classroom.code}), {})
        self.assertEqual(joined.status_code, status.HTTP_200_OK)
        self.assertEqual(joined.data, {'mode': 'livekit'})
        self.assertEqual(session.participant_count, 1)
        self.assertTrue(SessionAttendance.objects.filter(session=session, user=self.member, left_at=None).exists())
        token_response = self.client.get(token_url)
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        claims = jwt.decode(token_response.data['token'], 'test-secret', algorithms=['HS256'], audience=None)
        self.assertEqual(claims['video']['room'], session.room_name)
        self.assertEqual(claims['sub'], str(self.member.id))

        detail = self.client.get(reverse('classroom-detail', kwargs={'code': classroom.code}))
        self.assertTrue(detail.data['active_session']['current_user_joined'])

        left = self.client.post(reverse('session-leave', kwargs={'code': classroom.code}), {})
        self.assertEqual(left.status_code, status.HTTP_204_NO_CONTENT)
        session.refresh_from_db()
        self.assertEqual(session.participant_count, 0)
        self.assertEqual(self.client.get(token_url).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.owner)
        ended = self.client.post(reverse('session-end', kwargs={'code': classroom.code}), {})
        self.assertEqual(ended.status_code, status.HTTP_204_NO_CONTENT)
        delete_room.assert_called_once_with(session.room_name)
        self.assertEqual(LiveSession.objects.get().status, LiveSession.Status.ENDED)

    def test_local_presentation_shares_pdf_and_quiz_without_revealing_answer(self):
        classroom = Classroom.objects.create(name='Lớp video', owner=self.owner)
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        plan = LessonPlan.objects.create(classroom=classroom, title='Bài dạy')
        section = LessonSection.objects.create(plan=plan, title='Phần 1')
        pdf = LessonResource.objects.create(
            section=section, kind=LessonResource.Kind.PDF, title='Bài đọc.pdf',
            file=SimpleUploadedFile('lesson.pdf', make_test_pdf_bytes(page_count=2)),
            preview_page_count=2,
            visible_to_students=False,
        )
        quiz_resource = LessonResource.objects.create(
            section=section, kind=LessonResource.Kind.QUIZ, title='Kiểm tra nhanh',
            visible_to_students=False,
        )
        LessonQuiz.objects.create(
            resource=quiz_resource, question='Chọn đáp án đúng',
            options=['Sai', 'Đúng'], correct_option=1, duration_seconds=60,
        )
        session = LiveSession.objects.create(
            classroom=classroom, title='Buổi học', room_name='local-presentation-test',
            created_by=self.owner,
        )
        SessionAttendance.objects.bulk_create([
            SessionAttendance(session=session, user=self.owner),
            SessionAttendance(session=session, user=self.member),
        ])
        url = reverse('session-presentation', kwargs={'code': classroom.code})

        self.client.force_authenticate(self.owner)
        shown = self.client.post(url, {'action': 'show', 'resource_id': str(pdf.id)}, format='json')
        self.assertEqual(shown.status_code, status.HTTP_200_OK)
        self.assertEqual(shown.data['selected']['id'], str(pdf.id))
        self.assertFalse(shown.data['on_stage'])
        self.assertEqual(len(shown.data['resources']), 2)
        shared_page_url = reverse('session-presentation-pdf-page', kwargs={
            'code': classroom.code, 'resource_id': str(pdf.id), 'page': 1,
        })
        self.client.force_authenticate(self.member)
        self.assertIsNone(self.client.get(url).data['selected'])
        self.assertEqual(self.client.get(shared_page_url).status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(self.owner)
        presented = self.client.post(url, {'action': 'present'}, format='json')
        self.assertEqual(presented.status_code, status.HTTP_200_OK)
        self.assertTrue(presented.data['on_stage'])
        page = self.client.post(url, {'action': 'page', 'page': 2}, format='json')
        self.assertEqual(page.data['page'], 2)
        scrolled = self.client.post(url, {
            'action': 'scroll', 'resource_id': str(pdf.id), 'page': 2, 'position': 0.42,
        }, format='json')
        self.assertEqual(scrolled.data['stage_scroll'], 0.42)
        annotated = self.client.post(url, {
            'action': 'annotation_add', 'resource_id': str(pdf.id), 'page': 2,
            'kind': 'pen', 'points': [[0.1, 0.2], [0.3, 0.4]],
        }, format='json')
        self.assertEqual(annotated.status_code, status.HTTP_200_OK)
        annotation_id = annotated.data['stage_annotations'][0]['id']

        self.client.force_authenticate(self.member)
        member_view = self.client.get(url)
        self.assertEqual(member_view.data['selected']['id'], str(pdf.id))
        self.assertTrue(member_view.data['on_stage'])
        self.assertEqual(member_view.data['page'], 2)
        self.assertEqual(member_view.data['stage_scroll'], 0.42)
        self.assertEqual(member_view.data['stage_annotations'][0]['id'], annotation_id)
        self.assertEqual(member_view.data['resources'], [])
        self.assertEqual(self.client.get(shared_page_url).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post(url, {'action': 'clear'}, format='json').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post(url, {
            'action': 'annotation_undo', 'resource_id': str(pdf.id), 'page': 2,
        }, format='json').status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.owner)
        selected_quiz = self.client.post(url, {'action': 'show', 'resource_id': str(quiz_resource.id)}, format='json')
        self.assertEqual(selected_quiz.data['selected']['id'], str(quiz_resource.id))
        self.assertEqual(selected_quiz.data['stage']['id'], str(pdf.id))
        self.assertEqual(selected_quiz.data['stage_page'], 2)
        self.assertEqual(selected_quiz.data['stage_scroll'], 0.42)
        self.assertEqual(selected_quiz.data['stage_annotations'][0]['id'], annotation_id)
        self.client.force_authenticate(self.member)
        still_presented = self.client.get(url)
        self.assertEqual(still_presented.data['selected']['id'], str(pdf.id))
        self.assertEqual(still_presented.data['stage']['id'], str(pdf.id))
        self.assertEqual(self.client.get(shared_page_url).status_code, status.HTTP_200_OK)
        self.client.force_authenticate(self.owner)
        started_with_pdf = self.client.post(url, {'action': 'start_quiz', 'resource_id': str(quiz_resource.id)}, format='json')
        self.assertIsNotNone(started_with_pdf.data['active_run'])
        self.assertEqual(started_with_pdf.data['stage']['id'], str(pdf.id))
        changed_page = self.client.post(url, {'action': 'stage_page', 'page': 1}, format='json')
        self.assertEqual(changed_page.data['stage_page'], 1)
        self.assertEqual(changed_page.data['stage_scroll'], 0)
        self.assertEqual(changed_page.data['stage_annotations'], [])
        stale_scroll = self.client.post(url, {
            'action': 'scroll', 'resource_id': str(pdf.id), 'page': 2, 'position': 0.8,
        }, format='json')
        self.assertEqual(stale_scroll.status_code, status.HTTP_409_CONFLICT)
        text_note = self.client.post(url, {
            'action': 'annotation_add', 'resource_id': str(pdf.id), 'page': 1,
            'kind': 'text', 'points': [[0.5, 0.5]], 'text': 'Nhớ vị trí van tim',
        }, format='json')
        self.assertEqual(text_note.data['stage_annotations'][0]['text'], 'Nhớ vị trí van tim')
        removed_note = self.client.post(url, {
            'action': 'annotation_remove', 'resource_id': str(pdf.id), 'page': 1,
            'annotation_id': text_note.data['stage_annotations'][0]['id'],
        }, format='json')
        self.assertEqual(removed_note.data['stage_annotations'], [])
        revisited = self.client.post(url, {'action': 'stage_page', 'page': 2}, format='json')
        self.assertEqual(revisited.data['stage_annotations'][0]['id'], annotation_id)
        undone = self.client.post(url, {
            'action': 'annotation_undo', 'resource_id': str(pdf.id), 'page': 2,
        }, format='json')
        self.assertEqual(undone.data['stage_annotations'], [])
        self.client.force_authenticate(self.member)
        quiz_and_pdf = self.client.get(url)
        self.assertEqual(quiz_and_pdf.data['selected']['id'], str(quiz_resource.id))
        self.assertEqual(quiz_and_pdf.data['stage']['id'], str(pdf.id))
        self.assertIsNotNone(quiz_and_pdf.data['active_run'])
        self.client.force_authenticate(self.owner)
        self.client.post(url, {'action': 'show', 'resource_id': str(pdf.id)}, format='json')
        stopped = self.client.post(url, {'action': 'stop_present'}, format='json')
        self.assertFalse(stopped.data['on_stage'])
        self.client.force_authenticate(self.member)
        self.assertIsNone(self.client.get(url).data['selected'])
        self.assertEqual(self.client.get(shared_page_url).status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(self.owner)
        missing_file = self.client.post(url, {'action': 'upload'}, format='multipart')
        self.assertEqual(missing_file.status_code, status.HTTP_400_BAD_REQUEST)
        uploaded = self.client.post(url, {
            'action': 'upload',
            'file': SimpleUploadedFile('new-lesson.pdf', make_test_pdf_bytes('Page one'), content_type='application/pdf'),
        }, format='multipart')
        self.assertEqual(uploaded.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(shared_page_url).status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(self.owner)
        uploaded_id = uploaded.data['selected']['id']
        self.assertEqual(uploaded.data['selected']['preview_page_count'], 1)
        pdf_page = self.client.get(reverse('session-presentation-pdf-page', kwargs={
            'code': classroom.code, 'resource_id': uploaded_id, 'page': 1,
        }))
        self.assertEqual(pdf_page.status_code, status.HTTP_200_OK)
        self.assertEqual(pdf_page['Content-Type'], 'image/webp')
        studio_page = self.client.get(reverse('lesson-resource-pdf-page', kwargs={
            'code': classroom.code, 'resource_id': uploaded_id, 'page': 1,
        }))
        self.assertEqual(studio_page.status_code, status.HTTP_200_OK)
        chosen_quiz = self.client.post(url, {'action': 'show', 'resource_id': str(quiz_resource.id)}, format='json')
        self.assertEqual(chosen_quiz.status_code, status.HTTP_200_OK)
        self.assertEqual(chosen_quiz.data['selected']['id'], str(quiz_resource.id))
        self.assertIsNone(chosen_quiz.data['active_run'])
        self.client.force_authenticate(self.member)
        self.assertIsNone(self.client.get(url).data['selected'])
        self.client.force_authenticate(self.owner)
        started = self.client.post(url, {'action': 'start_quiz', 'resource_id': str(quiz_resource.id)}, format='json')
        self.assertEqual(started.status_code, status.HTTP_200_OK)
        run_id = started.data['active_run']['id']
        self.client.force_authenticate(self.member)
        student_quiz = self.client.get(url)
        self.assertNotIn('correct_option', student_quiz.data['selected']['quiz'])
        self.assertNotIn('correct_option', student_quiz.data['active_run'])
        answered = self.client.post(url, {'action': 'answer', 'run_id': run_id, 'selected_option': 1}, format='json')
        self.assertEqual(answered.status_code, status.HTTP_200_OK)
        self.assertEqual(answered.data['active_run']['selected_option'], 1)

    def test_local_presentation_imports_and_shares_links(self):
        classroom = Classroom.objects.create(name='Lớp liên kết', owner=self.owner)
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        session = LiveSession.objects.create(
            classroom=classroom, title='Buổi học', room_name='local-link-test', created_by=self.owner,
        )
        SessionAttendance.objects.bulk_create([
            SessionAttendance(session=session, user=self.owner),
            SessionAttendance(session=session, user=self.member),
        ])
        url = reverse('session-presentation', kwargs={'code': classroom.code})
        youtube_url = 'https://www.youtube.com/watch?v=AbCdEfGhI12'
        self.client.force_authenticate(self.owner)
        invalid = self.client.post(url, {'action': 'import_link', 'external_url': 'javascript:alert(1)'}, format='json')
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        imported_video = self.client.post(url, {
            'action': 'import_link', 'external_url': youtube_url, 'title': 'Bài giảng tim',
        }, format='json')
        self.assertEqual(imported_video.status_code, status.HTTP_200_OK)
        self.assertEqual(imported_video.data['selected']['kind'], LessonResource.Kind.VIDEO)
        self.assertEqual(imported_video.data['selected']['external_url'], youtube_url)
        self.assertFalse(imported_video.data['on_stage'])
        video_id = imported_video.data['selected']['id']
        presented_video = self.client.post(url, {'action': 'present'}, format='json')
        self.assertEqual(presented_video.data['stage']['id'], video_id)
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(url).data['stage']['external_url'], youtube_url)
        self.assertEqual(self.client.post(url, {
            'action': 'import_link', 'external_url': 'https://example.org/lesson',
        }, format='json').status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(self.owner)
        imported_link = self.client.post(url, {
            'action': 'import_link', 'external_url': 'https://example.org/lesson',
        }, format='json')
        self.assertEqual(imported_link.data['selected']['kind'], LessonResource.Kind.LINK)
        self.assertEqual(imported_link.data['stage']['id'], video_id)
        self.assertEqual(len(imported_link.data['resources']), 2)
        presented_link = self.client.post(url, {'action': 'present'}, format='json')
        self.assertEqual(presented_link.data['stage']['id'], imported_link.data['selected']['id'])
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(url).data['stage']['external_url'], 'https://example.org/lesson')

    def test_owner_can_crud_anatomy_lesson_content_and_member_is_read_only(self):
        classroom = Classroom.objects.create(name='Giải phẫu người', owner=self.owner, track='med')
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        system = BodySystem.objects.create(slug='skeletal', name_vi='Hệ xương', name_en='Skeletal system')
        model = AnatomyModel.objects.create(
            sketchfab_uid='abc123anatomy',
            system=system,
            title='Human skeleton',
            title_vi='Bộ xương người',
            is_published=True,
        )
        self.client.force_authenticate(self.owner)

        created_plan = self.client.post(reverse('lesson-plan', kwargs={'code': classroom.code}), {
            'subject': 'anatomy',
            'title': 'Giải phẫu người đại cương',
            'objective': 'Nhận diện các hệ cơ quan chính.',
        })
        self.assertEqual(created_plan.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created_plan.data['subject'], 'anatomy')
        default_section_id = created_plan.data['sections'][0]['id']

        created_section = self.client.post(reverse('lesson-section-list-create', kwargs={'code': classroom.code}), {
            'title': 'Hệ vận động',
            'duration_minutes': 25,
        })
        self.assertEqual(created_section.status_code, status.HTTP_201_CREATED)

        created_resource = self.client.post(reverse('lesson-resource-list-create', kwargs={
            'code': classroom.code,
            'section_id': created_section.data['id'],
        }), {
            'kind': 'model_3d',
            'title': 'Mô hình bộ xương người',
            'anatomy_model': model.sketchfab_uid,
            'duration_minutes': 15,
        }, format='json')
        self.assertEqual(created_resource.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created_resource.data['anatomy_model_detail']['title'], 'Bộ xương người')

        updated = self.client.patch(reverse('lesson-resource-detail', kwargs={
            'code': classroom.code,
            'resource_id': created_resource.data['id'],
        }), {'visible_to_students': False}, format='json')
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertFalse(updated.data['visible_to_students'])

        self.client.force_authenticate(self.member)
        read_plan = self.client.get(reverse('lesson-plan', kwargs={'code': classroom.code}))
        self.assertEqual(read_plan.status_code, status.HTTP_200_OK)
        forbidden = self.client.delete(reverse('lesson-section-detail', kwargs={
            'code': classroom.code,
            'section_id': default_section_id,
        }))
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(LessonPlan.objects.filter(classroom=classroom).count(), 1)
        self.assertEqual(LessonSection.objects.filter(plan__classroom=classroom).count(), 2)
        self.assertEqual(LessonResource.objects.filter(section__plan__classroom=classroom).count(), 1)
