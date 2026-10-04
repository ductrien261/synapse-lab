from datetime import timedelta
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import Mock, patch

from users.models import User
from anatomy.models import AnatomyModel, BodySystem

from .models import ClassMembership, Classroom, LessonPlan, LessonResource, LessonSection, LiveSession, SessionAttendance
from .services import BigBlueButtonService


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

    def test_bbb_status_reports_mock_mode(self):
        self.client.force_authenticate(self.owner)

        response = self.client.get(reverse('bbb-status'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['mode'], 'mock')
        self.assertTrue(response.data['reachable'])

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
