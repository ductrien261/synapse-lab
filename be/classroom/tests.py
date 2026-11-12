from datetime import timedelta

import jwt
import pymupdf as fitz
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
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
    LivePoll,
    LivePollResponse,
    LiveQuizResponse,
    LiveQuizRun,
    LiveSession,
    SessionAttendance,
    SessionWhiteboardSnapshot,
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

    def test_only_owner_can_rename_and_archive_classroom(self):
        classroom = Classroom.objects.create(name='Tên lớp cũ', owner=self.owner)
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        url = reverse('classroom-detail', kwargs={'code': classroom.code})

        self.client.force_authenticate(self.member)
        forbidden = self.client.patch(url, {'name': 'Không được đổi'}, format='json')
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.owner)
        renamed = self.client.patch(url, {'name': '  Lớp giải phẫu mới  '}, format='json')
        self.assertEqual(renamed.status_code, status.HTTP_200_OK)
        self.assertEqual(renamed.data['name'], 'Lớp giải phẫu mới')
        self.assertEqual(renamed.data['member_count'], 2)

        archived = self.client.patch(url, {'is_archived': True}, format='json')
        self.assertEqual(archived.status_code, status.HTTP_200_OK)
        self.assertTrue(archived.data['is_archived'])
        classroom.refresh_from_db()
        self.assertEqual(classroom.name, 'Lớp giải phẫu mới')
        self.assertTrue(classroom.is_archived)
        self.assertEqual(self.client.get(reverse('classroom-list-create')).data, [])

    def test_teacher_studio_accepts_long_pdf_and_docx_names_but_rejects_legacy_doc(self):
        classroom = Classroom.objects.create(name='Lớp tài liệu', owner=self.owner)
        ClassMembership.objects.create(
            classroom=classroom,
            user=self.owner,
            role=ClassMembership.Role.OWNER,
        )
        plan = LessonPlan.objects.create(classroom=classroom, title='Bài học')
        section = LessonSection.objects.create(plan=plan, title='Tài liệu')
        url = reverse('lesson-resource-list-create', kwargs={
            'code': classroom.code,
            'section_id': section.id,
        })
        self.client.force_authenticate(self.owner)

        long_pdf_name = f"{'tai_lieu_giai_phau_' * 7}.pdf"
        pdf_response = self.client.post(url, {
            'kind': LessonResource.Kind.PDF,
            'title': long_pdf_name,
            'file': SimpleUploadedFile(
                long_pdf_name,
                make_test_pdf_bytes('Long filename'),
                content_type='application/pdf',
            ),
        }, format='multipart')
        self.assertEqual(pdf_response.status_code, status.HTTP_201_CREATED)
        pdf_resource = LessonResource.objects.get(pk=pdf_response.data['id'])
        self.assertGreater(len(pdf_resource.file.name), 100)

        docx_response = self.client.post(url, {
            'kind': LessonResource.Kind.DOC,
            'title': 'Ke hoach bai day.docx',
            'file': SimpleUploadedFile(
                'Ke hoach bai day.docx',
                b'PK\x03\x04docx-placeholder',
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ),
        }, format='multipart')
        self.assertEqual(docx_response.status_code, status.HTTP_201_CREATED)

        legacy_doc = self.client.post(url, {
            'kind': LessonResource.Kind.DOC,
            'title': 'Tai lieu cu.doc',
            'file': SimpleUploadedFile('Tai lieu cu.doc', b'legacy-doc', content_type='application/msword'),
        }, format='multipart')
        self.assertEqual(legacy_doc.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('docx', str(legacy_doc.data['file'][0]).lower())

    def test_whiteboard_snapshot_is_saved_per_resource_page_by_owner(self):
        classroom = Classroom.objects.create(name='Lớp bảng cộng tác', owner=self.owner)
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        plan = LessonPlan.objects.create(classroom=classroom, title='Bài học')
        section = LessonSection.objects.create(plan=plan, title='Chủ đề')
        slide = LessonResource.objects.create(
            section=section,
            kind=LessonResource.Kind.SLIDE,
            title='Slide chính',
            preview_page_count=3,
        )
        session = LiveSession.objects.create(
            classroom=classroom,
            title='Buổi học',
            room_name='whiteboard-room',
            created_by=self.owner,
        )
        SessionAttendance.objects.bulk_create([
            SessionAttendance(session=session, user=self.owner),
            SessionAttendance(session=session, user=self.member),
        ])
        url = reverse('session-whiteboard', kwargs={'code': classroom.code})
        stroke = {
            'id': 'stroke-1',
            'authorId': str(self.member.id),
            'authorName': 'Học viên',
            'tool': 'pen',
            'color': '#2563EB',
            'points': [[0.1, 0.2], [0.4, 0.5]],
            'createdAt': 123456,
        }

        self.client.force_authenticate(self.member)
        forbidden = self.client.put(url, {
            'resource_id': str(slide.id), 'page': 2, 'strokes': [stroke], 'locked': False,
        }, format='json')
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.owner)
        saved = self.client.put(url, {
            'resource_id': str(slide.id), 'page': 2, 'strokes': [stroke], 'locked': False,
        }, format='json')
        self.assertEqual(saved.status_code, status.HTTP_200_OK)
        self.assertEqual(saved.data['page'], 2)
        self.assertEqual(saved.data['strokes'][0]['id'], 'stroke-1')
        self.assertFalse(saved.data['locked'])
        self.assertEqual(SessionWhiteboardSnapshot.objects.count(), 1)

        restored = self.client.get(url, {'resource_id': str(slide.id), 'page': 2})
        self.assertEqual(restored.status_code, status.HTTP_200_OK)
        self.assertEqual(restored.data['strokes'], saved.data['strokes'])

        other_page = self.client.get(url, {'resource_id': str(slide.id), 'page': 1})
        self.assertEqual(other_page.status_code, status.HTTP_200_OK)
        self.assertEqual(other_page.data['strokes'], [])
        self.assertTrue(other_page.data['locked'])

    def test_realtime_poll_is_persisted_and_updates_results(self):
        classroom = Classroom.objects.create(name='Lớp poll', owner=self.owner)
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        session = LiveSession.objects.create(
            classroom=classroom,
            title='Buổi học poll',
            room_name='poll-room',
            created_by=self.owner,
        )
        SessionAttendance.objects.bulk_create([
            SessionAttendance(session=session, user=self.owner),
            SessionAttendance(session=session, user=self.member),
        ])
        url = reverse('session-poll', kwargs={'code': classroom.code})

        self.client.force_authenticate(self.member)
        forbidden = self.client.post(url, {
            'action': 'start',
            'question': 'Bạn muốn ôn phần nào?',
            'options': ['Tim', 'Phổi'],
        }, format='json')
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.owner)
        started = self.client.post(url, {
            'action': 'start',
            'question': 'Bạn muốn ôn phần nào?',
            'options': ['Tim', 'Phổi'],
            'duration_seconds': 60,
            'is_anonymous': True,
        }, format='json')
        self.assertEqual(started.status_code, status.HTTP_201_CREATED)
        poll_id = started.data['poll']['id']
        self.assertEqual(started.data['poll']['option_counts'], [0, 0])

        self.client.force_authenticate(self.member)
        before_answer = self.client.get(url)
        self.assertIsNone(before_answer.data['poll']['option_counts'])
        answered = self.client.post(url, {
            'action': 'answer', 'poll_id': poll_id, 'selected_option': 1,
        }, format='json')
        self.assertEqual(answered.status_code, status.HTTP_200_OK)
        self.assertEqual(answered.data['poll']['selected_option'], 1)
        duplicate = self.client.post(url, {
            'action': 'answer', 'poll_id': poll_id, 'selected_option': 0,
        }, format='json')
        self.assertEqual(duplicate.status_code, status.HTTP_409_CONFLICT)

        self.client.force_authenticate(self.owner)
        live_results = self.client.get(url)
        self.assertEqual(live_results.data['poll']['option_counts'], [0, 1])
        self.assertEqual(live_results.data['poll']['response_count'], 1)
        closed = self.client.post(url, {'action': 'close', 'poll_id': poll_id}, format='json')
        self.assertEqual(closed.data['poll']['status'], LivePoll.Status.CLOSED)

        self.client.force_authenticate(self.member)
        published = self.client.get(url)
        self.assertEqual(published.data['poll']['option_counts'], [0, 1])
        self.assertEqual(LivePollResponse.objects.filter(poll_id=poll_id).count(), 1)

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
        session.refresh_from_db()
        self.assertEqual(session.participant_count, 1)
        self.assertTrue(SessionAttendance.objects.filter(session=session, user=self.member, left_at=None).exists())
        token_response = self.client.get(token_url)
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        claims = jwt.decode(token_response.data['token'], 'test-secret', algorithms=['HS256'], audience=None)
        self.assertEqual(claims['video']['room'], session.room_name)
        self.assertEqual(claims['sub'], str(self.member.id))
        self.assertJSONEqual(claims['metadata'], {'role': 'member'})

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

    def test_quiz_automatically_starts_at_configured_session_minute(self):
        classroom = Classroom.objects.create(name='Lớp tự động', owner=self.owner)
        ClassMembership.objects.create(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER)
        plan = LessonPlan.objects.create(classroom=classroom, title='Kịch bản tự động')
        section = LessonSection.objects.create(plan=plan, title='Kiểm tra giữa giờ')
        resource = LessonResource.objects.create(section=section, kind=LessonResource.Kind.QUIZ, title='Quiz phút 5')
        quiz = LessonQuiz.objects.create(
            resource=resource,
            question='Câu hỏi tự động?',
            options=['Đúng', 'Sai'],
            correct_option=0,
            trigger_mode=LessonQuiz.TriggerMode.AT_MINUTE,
            trigger_minute=5,
        )
        session = LiveSession.objects.create(
            classroom=classroom, title='Buổi học', room_name='auto-minute-room', created_by=self.owner,
        )
        LiveSession.objects.filter(pk=session.pk).update(started_at=timezone.now() - timedelta(minutes=6))
        SessionAttendance.objects.create(session=session, user=self.owner)
        self.client.force_authenticate(self.owner)

        response = self.client.get(reverse('session-presentation', kwargs={'code': classroom.code}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['selected']['id'], str(resource.id))
        self.assertEqual(response.data['active_run']['quiz']['id'], str(resource.id))
        run = LiveQuizRun.objects.get(session=session, quiz=quiz)
        self.assertIsNone(run.started_by)
        self.assertEqual(response.data['last_automation']['trigger_mode'], LessonQuiz.TriggerMode.AT_MINUTE)

    def test_session_uses_only_resources_selected_at_start(self):
        classroom = Classroom.objects.create(name='Lớp chọn tài liệu', owner=self.owner)
        ClassMembership.objects.create(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER)
        plan = LessonPlan.objects.create(classroom=classroom, title='Kho nội dung')
        section = LessonSection.objects.create(plan=plan, title='Chủ đề 1')
        selected_pdf = LessonResource.objects.create(
            section=section,
            kind=LessonResource.Kind.PDF,
            title='Tài liệu hôm nay',
            file=SimpleUploadedFile('today.pdf', make_test_pdf_bytes()),
        )
        excluded_quiz_resource = LessonResource.objects.create(
            section=section,
            kind=LessonResource.Kind.QUIZ,
            title='Quiz buổi sau',
        )
        LessonQuiz.objects.create(
            resource=excluded_quiz_resource,
            question='Không được tự bật?',
            options=['Có', 'Không'],
            correct_option=1,
            trigger_mode=LessonQuiz.TriggerMode.AT_MINUTE,
            trigger_minute=0,
        )
        self.client.force_authenticate(self.owner)

        started = self.client.post(
            reverse('session-start', kwargs={'code': classroom.code}),
            {'resource_ids': [str(selected_pdf.id)]},
            format='json',
        )
        self.assertEqual(started.status_code, status.HTTP_201_CREATED)
        session = LiveSession.objects.get(classroom=classroom, status=LiveSession.Status.LIVE)
        self.assertTrue(session.uses_resource_selection)
        self.assertEqual(list(session.selected_resources.values_list('id', flat=True)), [selected_pdf.id])

        self.client.post(reverse('session-join', kwargs={'code': classroom.code}), {}, format='json')
        presentation_url = reverse('session-presentation', kwargs={'code': classroom.code})
        presentation = self.client.get(presentation_url)
        self.assertEqual([item['id'] for item in presentation.data['resources']], [str(selected_pdf.id)])
        self.assertIsNone(presentation.data['active_run'])
        excluded = self.client.post(
            presentation_url,
            {'action': 'show', 'resource_id': str(excluded_quiz_resource.id)},
            format='json',
        )
        self.assertEqual(excluded.status_code, status.HTTP_404_NOT_FOUND)

    def test_quiz_automatically_starts_when_teacher_reaches_slide(self):
        classroom = Classroom.objects.create(name='Lớp theo slide', owner=self.owner)
        ClassMembership.objects.create(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER)
        plan = LessonPlan.objects.create(classroom=classroom, title='Kịch bản slide')
        section = LessonSection.objects.create(plan=plan, title='Bài giảng')
        slide = LessonResource.objects.create(
            section=section,
            kind=LessonResource.Kind.SLIDE,
            title='Bài giảng chính',
            file='lesson-resources/test.pptx',
            preview_page_count=5,
        )
        quiz_resource = LessonResource.objects.create(section=section, kind=LessonResource.Kind.QUIZ, title='Quiz trang 3')
        quiz = LessonQuiz.objects.create(
            resource=quiz_resource,
            question='Đã tới trang ba?',
            options=['Rồi', 'Chưa'],
            correct_option=0,
            trigger_mode=LessonQuiz.TriggerMode.AT_SLIDE,
            trigger_resource=slide,
            trigger_slide_number=3,
        )
        session = LiveSession.objects.create(
            classroom=classroom, title='Buổi học', room_name='auto-slide-room', created_by=self.owner,
        )
        SessionAttendance.objects.create(session=session, user=self.owner)
        cache.delete(f'local-presentation:{session.id}')
        url = reverse('session-presentation', kwargs={'code': classroom.code})
        self.client.force_authenticate(self.owner)

        self.assertEqual(self.client.post(url, {'action': 'show', 'resource_id': str(slide.id)}, format='json').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post(url, {'action': 'present'}, format='json').status_code, status.HTTP_200_OK)
        response = self.client.post(url, {'action': 'stage_page', 'page': 3}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['active_run'])
        self.assertEqual(response.data['upcoming_quiz']['quiz_id'], str(quiz_resource.id))
        self.assertGreater(response.data['upcoming_quiz']['remaining_ms'], 0)
        presentation = cache.get(f'local-presentation:{session.id}')
        presentation['pending_quiz']['starts_at_timestamp'] = timezone.now().timestamp() - 1
        cache.set(f'local-presentation:{session.id}', presentation)

        response = self.client.get(url)

        self.assertEqual(response.data['active_run']['quiz']['id'], str(quiz_resource.id))
        self.assertTrue(LiveQuizRun.objects.filter(session=session, quiz=quiz).exists())
        self.assertEqual(response.data['last_automation']['trigger_mode'], LessonQuiz.TriggerMode.AT_SLIDE)

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

    def test_owner_can_present_anatomy_model_to_members(self):
        classroom = Classroom.objects.create(name='Lớp mô hình 3D', owner=self.owner, track='med')
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        system = BodySystem.objects.create(slug='cardiovascular', name_vi='Hệ tim mạch', name_en='Cardiovascular')
        model = AnatomyModel.objects.create(
            sketchfab_uid='heart3d123', system=system, title='Human heart', title_vi='Tim người', is_published=True,
        )
        plan = LessonPlan.objects.create(classroom=classroom, title='Giải phẫu tim')
        section = LessonSection.objects.create(plan=plan, title='Cấu tạo tim')
        resource = LessonResource.objects.create(
            section=section, kind=LessonResource.Kind.MODEL_3D, title='Mô hình tim người', anatomy_model=model,
        )
        session = LiveSession.objects.create(
            classroom=classroom, title='Buổi học 3D', room_name='anatomy-model-presentation', created_by=self.owner,
        )
        SessionAttendance.objects.bulk_create([
            SessionAttendance(session=session, user=self.owner),
            SessionAttendance(session=session, user=self.member),
        ])
        url = reverse('session-presentation', kwargs={'code': classroom.code})

        self.client.force_authenticate(self.owner)
        library = self.client.get(url)
        self.assertEqual([item['id'] for item in library.data['resources']], [str(resource.id)])
        self.assertEqual(library.data['resources'][0]['kind'], LessonResource.Kind.MODEL_3D)
        selected = self.client.post(url, {'action': 'show', 'resource_id': str(resource.id)}, format='json')
        self.assertEqual(selected.status_code, status.HTTP_200_OK)
        self.assertEqual(selected.data['selected']['anatomy_model_detail']['sketchfab_uid'], model.sketchfab_uid)
        presented = self.client.post(url, {'action': 'present'}, format='json')
        self.assertEqual(presented.status_code, status.HTTP_200_OK)
        self.assertEqual(presented.data['stage']['kind'], LessonResource.Kind.MODEL_3D)

        self.client.force_authenticate(self.member)
        member_view = self.client.get(url)
        self.assertEqual(member_view.data['stage']['id'], str(resource.id))
        self.assertEqual(member_view.data['stage']['anatomy_model_detail']['embed_url'], model.embed_url)
        self.assertEqual(member_view.data['resources'], [])

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

    def test_owner_can_view_quiz_report_and_ending_session_closes_open_run(self):
        classroom = Classroom.objects.create(name='Lớp báo cáo', owner=self.owner)
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        session = LiveSession.objects.create(
            classroom=classroom, title='Buổi kiểm tra', room_name='quiz-report-room', created_by=self.owner,
        )
        SessionAttendance.objects.bulk_create([
            SessionAttendance(session=session, user=self.owner),
            SessionAttendance(session=session, user=self.member),
        ])
        plan = LessonPlan.objects.create(classroom=classroom, title='Bài kiểm tra')
        section = LessonSection.objects.create(plan=plan, title='Ôn tập')
        resource = LessonResource.objects.create(section=section, kind=LessonResource.Kind.QUIZ, title='Quiz tim')
        quiz = LessonQuiz.objects.create(
            resource=resource,
            question='Đáp án nào đúng?',
            options=['Sai', 'Đúng'],
            correct_option=1,
            success_threshold=70,
        )
        run = LiveQuizRun.objects.create(
            session=session,
            quiz=quiz,
            closes_at=timezone.now() + timedelta(minutes=1),
            started_by=self.owner,
        )
        LiveQuizResponse.objects.create(run=run, user=self.member, selected_option=1, is_correct=True)

        report_url = reverse('session-quiz-report', kwargs={'code': classroom.code})
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(report_url).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.owner)
        report = self.client.get(report_url)
        self.assertEqual(report.status_code, status.HTTP_200_OK)
        self.assertEqual(report.data['summary']['accuracy_percent'], 100)
        self.assertEqual(report.data['sessions'][0]['runs'][0]['response_rate_percent'], 100)
        self.assertEqual(report.data['sessions'][0]['runs'][0]['responses'][0]['email'], self.member.email)

        with patch('classroom.views.delete_room'):
            ended = self.client.post(reverse('session-end', kwargs={'code': classroom.code}))
        self.assertEqual(ended.status_code, status.HTTP_204_NO_CONTENT)
        run.refresh_from_db()
        self.assertEqual(run.status, LiveQuizRun.Status.CLOSED)
        self.assertIsNotNone(run.closed_at)

    @patch('classroom.views.call_ai')
    def test_student_assistant_uses_current_and_previous_pdf_pages_with_history(self, call_ai_mock):
        classroom = Classroom.objects.create(name='Lớp trợ lý', owner=self.owner)
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        plan = LessonPlan.objects.create(classroom=classroom, title='Bài học', objective='Hiểu nội dung bài học')
        section = LessonSection.objects.create(plan=plan, title='Khái niệm chính')
        pdf = LessonResource.objects.create(
            section=section,
            kind=LessonResource.Kind.PDF,
            title='Tài liệu học.pdf',
            file=SimpleUploadedFile(
                'assistant.pdf',
                make_test_pdf_bytes('Nội dung trang đủ dài để trợ lý giải thích cho học sinh trong lớp học trực tiếp.', page_count=2),
            ),
            preview_page_count=2,
        )
        session = LiveSession.objects.create(
            classroom=classroom, title='Buổi học', room_name='assistant-room', created_by=self.owner,
        )
        SessionAttendance.objects.bulk_create([
            SessionAttendance(session=session, user=self.owner),
            SessionAttendance(session=session, user=self.member),
        ])
        presentation_url = reverse('session-presentation', kwargs={'code': classroom.code})
        self.client.force_authenticate(self.owner)
        self.client.post(presentation_url, {'action': 'show', 'resource_id': str(pdf.id)}, format='json')
        self.client.post(presentation_url, {'action': 'present'}, format='json')
        self.client.post(presentation_url, {'action': 'stage_page', 'page': 2}, format='json')

        call_ai_mock.return_value = {
            'status': 'ok',
            'answer': 'Trang 2 tiếp nối khái niệm ở trang 1.',
            'used_external_knowledge': False,
            'suggested_questions': ['Cho mình ví dụ?', 'Điểm chính là gì?'],
            'meta': {},
        }
        assistant_url = reverse('session-classroom-assistant', kwargs={'code': classroom.code})
        self.client.force_authenticate(self.member)
        geometry = self.client.get(reverse('session-presentation-pdf-text', kwargs={
            'code': classroom.code,
            'resource_id': pdf.id,
            'page': 2,
        }))
        self.assertEqual(geometry.status_code, status.HTTP_200_OK)
        self.assertTrue(geometry.data['blocks'])
        self.assertTrue(geometry.data['words'])
        self.assertTrue(all(0 <= value <= 1 for value in geometry.data['words'][0]['bbox']))

        response = self.client.post(assistant_url, {
            'resource_id': str(pdf.id),
            'page': 2,
            'question': 'Nội dung này liên quan trang trước thế nào?',
            'history': [{'role': 'assistant', 'content': 'Trang 1 giới thiệu khái niệm.', 'page': 1}],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['context']['source_pages'], [1, 2])
        self.assertEqual(response.data['answer'], 'Trang 2 tiếp nối khái niệm ở trang 1.')
        ai_path, payload = call_ai_mock.call_args.args[:2]
        self.assertEqual(ai_path, '/v1/classroom/assistant')
        self.assertEqual([item['page'] for item in payload['page_contexts']], [1, 2])
        self.assertEqual(payload['history'][0]['page'], 1)
        self.assertNotIn('teacher_notes', payload)

        independent_page = self.client.post(assistant_url, {
            'resource_id': str(pdf.id),
            'page': 1,
            'question': 'Giải thích và liên hệ đoạn này: ' + ('nội dung dài ' * 120),
            'history': [],
        }, format='json')
        self.assertEqual(independent_page.status_code, status.HTTP_200_OK)
        self.assertEqual(independent_page.data['context']['source_pages'], [1])

        self.client.force_authenticate(self.owner)
        self.client.post(presentation_url, {'action': 'stop_present'}, format='json')
        self.client.force_authenticate(self.member)
        stale = self.client.post(assistant_url, {
            'resource_id': str(pdf.id),
            'page': 1,
            'question': 'Tài liệu còn đang chiếu không?',
            'history': [],
        }, format='json')
        self.assertEqual(stale.status_code, status.HTTP_409_CONFLICT)
