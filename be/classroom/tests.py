from datetime import timedelta
from urllib.parse import urlsplit
from xml.etree import ElementTree

import pymupdf as fitz
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import Mock, patch

from users.models import User
from anatomy.models import AnatomyModel, BodySystem

from .models import (
    ClassMembership,
    Classroom,
    LessonPlan,
    LessonQuiz,
    LessonResource,
    LessonSection,
    LiveQuizResponse,
    LiveSession,
    SessionAttendance,
)
from .bbb_documents import build_bbb_pdf_reader_url, build_bbb_presentation_documents
from .quiz_runtime import build_bbb_quiz_runtime_url
from .services import BigBlueButtonService


def make_test_pdf_bytes(text='Synapse PDF'):
    with fitz.open() as document:
        page = document.new_page()
        page.insert_text((72, 72), text)
        return document.tobytes()


@override_settings(
    BBB_ENABLED=True,
    BBB_URL='https://bbb.example.com/bigbluebutton/api',
    BBB_SECRET='test-secret',
    BBB_CHECKSUM_ALGORITHM='sha256',
)
class BigBlueButtonServiceTests(SimpleTestCase):
    def test_join_url_is_signed_without_exposing_secret(self):
        url = BigBlueButtonService().join_url(
            meeting_id='meeting-1',
            full_name='Nguyen Van A',
            user_id='user-1',
            moderator=True,
        )

        self.assertIn('/join?', url)
        self.assertIn('role=MODERATOR', url)
        self.assertIn('checksum=', url)
        self.assertNotIn('test-secret', url)

    @patch.object(BigBlueButtonService, '_request')
    def test_create_meeting_enables_media_chat_and_multi_user_whiteboard(self, request):
        BigBlueButtonService().create_meeting(
            meeting_id='meeting-1',
            name='Lop hoc tuong tac',
        )

        call_name, params = request.call_args.args
        self.assertEqual(call_name, 'create')
        self.assertEqual(params['lockSettingsDisableCam'], 'false')
        self.assertEqual(params['lockSettingsDisableMic'], 'false')
        self.assertEqual(params['lockSettingsDisablePublicChat'], 'false')
        self.assertEqual(params['lockSettingsDisablePrivateChat'], 'false')
        self.assertEqual(params['multiUserWhiteboardEnabled'], 'true')

    @patch.object(BigBlueButtonService, '_request')
    def test_create_meeting_preuploads_presentations_as_xml(self, request):
        BigBlueButtonService().create_meeting(
            meeting_id='meeting-1',
            name='Lop hoc tuong tac',
            presentations=[{
                'url': 'https://api.example.com/lesson.pdf?token=a&part=b',
                'filename': 'lesson.pdf',
                'downloadable': True,
                'removable': False,
                'current': True,
            }],
        )

        call_name, params = request.call_args.args
        body = request.call_args.kwargs['body']
        document = ElementTree.fromstring(body).find('./module/document')
        self.assertEqual(call_name, 'create')
        self.assertEqual(params['meetingID'], 'meeting-1')
        self.assertEqual(document.attrib['url'], 'https://api.example.com/lesson.pdf?token=a&part=b')
        self.assertEqual(document.attrib['downloadable'], 'true')
        self.assertEqual(document.attrib['current'], 'true')

    @patch('classroom.services.requests.get')
    def test_meeting_status_reads_participant_count(self, get):
        running = Mock(content=b'<response><returncode>SUCCESS</returncode><running>true</running></response>')
        running.raise_for_status.return_value = None
        info = Mock(content=b'<response><returncode>SUCCESS</returncode><participantCount>3</participantCount></response>')
        info.raise_for_status.return_value = None
        get.side_effect = [running, info]

        result = BigBlueButtonService().meeting_status(meeting_id='meeting-1')

        self.assertEqual(result, {'running': True, 'participant_count': 3})


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

    @override_settings(BBB_ENABLED=False)
    def test_mock_session_lifecycle_and_permissions(self):
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
        self.assertEqual(started.data['active_session']['mode'], 'mock')

        self.client.force_authenticate(self.member)
        joined = self.client.post(reverse('session-join', kwargs={'code': classroom.code}), {})
        self.assertEqual(joined.status_code, status.HTTP_200_OK)
        self.assertEqual(joined.data, {'mode': 'mock', 'join_url': None})
        session = LiveSession.objects.get()
        self.assertEqual(session.participant_count, 1)
        self.assertTrue(SessionAttendance.objects.filter(session=session, user=self.member, left_at=None).exists())

        detail = self.client.get(reverse('classroom-detail', kwargs={'code': classroom.code}))
        self.assertTrue(detail.data['active_session']['current_user_joined'])

        left = self.client.post(reverse('session-leave', kwargs={'code': classroom.code}), {})
        self.assertEqual(left.status_code, status.HTTP_204_NO_CONTENT)
        session.refresh_from_db()
        self.assertEqual(session.participant_count, 0)

        self.client.force_authenticate(self.owner)
        ended = self.client.post(reverse('session-end', kwargs={'code': classroom.code}), {})
        self.assertEqual(ended.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(LiveSession.objects.get().status, LiveSession.Status.ENDED)

    @override_settings(BBB_ENABLED=False)
    def test_bbb_status_reports_mock_mode(self):
        self.client.force_authenticate(self.owner)

        response = self.client.get(reverse('bbb-status'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['mode'], 'mock')
        self.assertTrue(response.data['reachable'])

    @override_settings(BBB_ASSET_BASE_URL='https://api.synapse.test', BBB_RESOURCE_URL_TTL=600)
    def test_bbb_documents_use_rendered_slides_and_signed_download_urls(self):
        classroom = Classroom.objects.create(name='Lớp tài liệu', owner=self.owner)
        plan = LessonPlan.objects.create(classroom=classroom, title='Bài học', subject='anatomy')
        first_section = LessonSection.objects.create(plan=plan, title='Phần 1', position=0)
        second_section = LessonSection.objects.create(plan=plan, title='Phần 2', position=1)
        pdf = LessonResource.objects.create(
            section=second_section,
            kind=LessonResource.Kind.PDF,
            title='Tài liệu tham khảo.pdf',
            file=SimpleUploadedFile('reference.pdf', make_test_pdf_bytes('Reference PDF')),
            position=0,
            allow_download=True,
        )
        slide = LessonResource.objects.create(
            section=first_section,
            kind=LessonResource.Kind.SLIDE,
            title='Bài giảng.pptx',
            preview_pdf=SimpleUploadedFile('slides.pdf', make_test_pdf_bytes('Slides PDF')),
            preview_status=LessonResource.PreviewStatus.READY,
            position=0,
        )
        LessonResource.objects.create(
            section=first_section,
            kind=LessonResource.Kind.MODEL_3D,
            title='Mô hình không gửi sang presentation',
            position=1,
        )

        documents = build_bbb_presentation_documents(classroom)

        self.assertEqual([item['filename'] for item in documents], ['bai-giang.pdf', 'tai-lieu-tham-khao.pdf'])
        self.assertTrue(documents[0]['current'])
        self.assertFalse(documents[1]['current'])
        self.assertFalse(documents[0]['downloadable'])
        self.assertTrue(documents[1]['downloadable'])

        reader_url = urlsplit(build_bbb_pdf_reader_url(classroom))
        reader_response = self.client.get(f'{reader_url.path}?{reader_url.query}')
        self.assertEqual(reader_response.status_code, status.HTTP_200_OK)
        self.assertContains(reader_response, 'synapse-pdf-reader-scroll')
        self.assertNotEqual(reader_response.get('X-Frame-Options'), 'DENY')
        reader_page_response = self.client.get(
            f'{reader_url.path}?{reader_url.query}&page=1'
        )
        self.assertEqual(reader_page_response.status_code, status.HTTP_200_OK)
        self.assertEqual(reader_page_response['Content-Type'], 'image/webp')

        download_url = urlsplit(documents[0]['url'])
        response = self.client.get(f'{download_url.path}?{download_url.query}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        marked_pdf = b''.join(response.streaming_content)
        with fitz.open(stream=marked_pdf, filetype='pdf') as document:
            self.assertIn(f'SYNAPSE_RESOURCE:{slide.id};SYNAPSE_PAGE:1', document[0].get_text())

    @override_settings(
        BBB_ENABLED=True,
        BBB_ASSET_BASE_URL='https://api.synapse.test',
        BBB_RESOURCE_URL_TTL=600,
    )
    @patch('classroom.views.BigBlueButtonService.create_meeting')
    def test_starting_bbb_session_preloads_ready_lesson_documents(self, create_meeting):
        classroom = Classroom.objects.create(name='Lớp BBB có tài liệu', owner=self.owner)
        ClassMembership.objects.create(
            classroom=classroom,
            user=self.owner,
            role=ClassMembership.Role.OWNER,
        )
        plan = LessonPlan.objects.create(classroom=classroom, title='Bài học', subject='anatomy')
        section = LessonSection.objects.create(plan=plan, title='Phần 1', position=0)
        slide = LessonResource.objects.create(
            section=section,
            kind=LessonResource.Kind.SLIDE,
            title='Bài giảng.pptx',
            preview_pdf=SimpleUploadedFile('slides.pdf', b'%PDF-1.4 slides'),
            preview_status=LessonResource.PreviewStatus.READY,
            position=0,
        )
        self.client.force_authenticate(self.owner)

        response = self.client.post(reverse('session-start', kwargs={'code': classroom.code}), {})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        presentations = create_meeting.call_args.kwargs['presentations']
        self.assertEqual(len(presentations), 1)
        self.assertEqual(presentations[0]['filename'], 'bai-giang.pdf')
        self.assertTrue(presentations[0]['current'])
        slide.preview_pdf.delete(save=False)

    @override_settings(BBB_ASSET_BASE_URL='https://api.synapse.test', BBB_RESOURCE_URL_TTL=600)
    def test_slide_quiz_runtime_opens_once_and_records_student_answer(self):
        classroom = Classroom.objects.create(name='Lớp quiz', owner=self.owner)
        ClassMembership.objects.bulk_create([
            ClassMembership(classroom=classroom, user=self.owner, role=ClassMembership.Role.OWNER),
            ClassMembership(classroom=classroom, user=self.member, role=ClassMembership.Role.MEMBER),
        ])
        plan = LessonPlan.objects.create(classroom=classroom, title='Bài học', subject='anatomy')
        section = LessonSection.objects.create(plan=plan, title='Phần quiz')
        slide = LessonResource.objects.create(
            section=section,
            kind=LessonResource.Kind.SLIDE,
            title='Bài giảng',
            preview_status=LessonResource.PreviewStatus.READY,
            preview_page_count=5,
        )
        quiz_resource = LessonResource.objects.create(
            section=section,
            kind=LessonResource.Kind.QUIZ,
            title='Kiểm tra nhanh',
        )
        quiz = LessonQuiz.objects.create(
            resource=quiz_resource,
            question='Đáp án đúng là gì?',
            options=['Sai', 'Đúng'],
            correct_option=1,
            trigger_mode=LessonQuiz.TriggerMode.AT_MINUTE,
            duration_seconds=60,
        )
        self.client.force_authenticate(self.owner)
        updated_quiz = self.client.patch(reverse('lesson-resource-detail', kwargs={
            'code': classroom.code,
            'resource_id': quiz_resource.id,
        }), {
            'quiz': {
                'question': quiz.question,
                'options': quiz.options,
                'correct_option': quiz.correct_option,
                'duration_seconds': quiz.duration_seconds,
                'trigger_mode': LessonQuiz.TriggerMode.AT_SLIDE,
                'trigger_minute': 0,
                'delay_seconds': 0,
                # Older Teacher Studio drafts sent the slide title instead of its UUID.
                'trigger_resource': slide.title,
                'trigger_slide_number': 3,
                'success_threshold': quiz.success_threshold,
            },
        }, format='json')
        self.assertEqual(updated_quiz.status_code, status.HTTP_200_OK, updated_quiz.data)
        quiz.refresh_from_db()
        self.assertEqual(quiz.trigger_mode, LessonQuiz.TriggerMode.AT_SLIDE)
        self.assertEqual(quiz.trigger_resource_id, slide.id)
        self.assertEqual(quiz.trigger_slide_number, 3)
        session = LiveSession.objects.create(
            classroom=classroom,
            title='Buổi học',
            bbb_meeting_id='quiz-meeting',
            created_by=self.owner,
        )
        SessionAttendance.objects.create(session=session, user=self.member)
        owner_url = urlsplit(build_bbb_quiz_runtime_url(session, self.owner, moderator=True))
        member_url = urlsplit(build_bbb_quiz_runtime_url(session, self.member, moderator=False))
        owner_endpoint = f'{owner_url.path}?{owner_url.query}'
        member_endpoint = f'{member_url.path}?{member_url.query}'

        runtime = self.client.get(owner_endpoint)
        self.assertEqual(runtime.status_code, status.HTTP_200_OK, (owner_endpoint, runtime.content[:500]))
        self.assertEqual(runtime.data['schedule'][0]['trigger_slide_number'], 3)

        started = self.client.post(owner_endpoint, {'action': 'start', 'quiz_id': quiz.pk}, format='json')
        self.assertEqual(started.status_code, status.HTTP_200_OK)
        run_id = started.data['id']
        started_again = self.client.post(owner_endpoint, {'action': 'start', 'quiz_id': quiz.pk}, format='json')
        self.assertEqual(started_again.data['id'], run_id)

        # Students who joined before the quiz opened can discover the active
        # run by polling their base runtime URL, even if a BBB data-channel
        # notification was missed during a reconnect.
        discovered_runtime = self.client.get(member_endpoint)
        self.assertEqual(discovered_runtime.status_code, status.HTTP_200_OK)
        self.assertEqual(discovered_runtime.data['active_run']['id'], run_id)
        self.assertFalse(discovered_runtime.data['is_moderator'])

        student_runtime = self.client.get(f'{member_endpoint}&run_id={run_id}')
        self.assertNotIn('correct_option', student_runtime.data['active_run'])
        answered = self.client.post(member_endpoint, {
            'action': 'answer',
            'run_id': run_id,
            'selected_option': 1,
        }, format='json')
        self.assertEqual(answered.status_code, status.HTTP_200_OK)
        self.assertEqual(LiveQuizResponse.objects.get().is_correct, True)

        results = self.client.get(f'{owner_endpoint}&run_id={run_id}')
        self.assertEqual(results.data['active_run']['results']['option_counts'], [0, 1])
        self.assertEqual(results.data['active_run']['results']['correct_option'], 1)

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

    @override_settings(BBB_ENABLED=True)
    @patch('classroom.views.BigBlueButtonService.meeting_status', return_value={'running': False, 'participant_count': 0})
    def test_new_empty_bbb_meeting_has_join_grace_period(self, _meeting_status):
        classroom = Classroom.objects.create(name='Lớp BBB', owner=self.owner)
        ClassMembership.objects.create(
            classroom=classroom,
            user=self.owner,
            role=ClassMembership.Role.OWNER,
        )
        session = LiveSession.objects.create(
            classroom=classroom,
            title='Phiên BBB',
            bbb_meeting_id='synapse-grace-period',
            created_by=self.owner,
        )
        self.client.force_authenticate(self.owner)

        fresh = self.client.get(reverse('classroom-detail', kwargs={'code': classroom.code}))
        self.assertIsNotNone(fresh.data['active_session'])

        LiveSession.objects.filter(pk=session.pk).update(started_at=timezone.now() - timedelta(minutes=4))
        expired = self.client.get(reverse('classroom-detail', kwargs={'code': classroom.code}))
        self.assertIsNone(expired.data['active_session'])
