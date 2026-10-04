import hashlib
from urllib.parse import urlencode
from xml.etree import ElementTree

import requests
from django.conf import settings


class BigBlueButtonError(RuntimeError):
    pass


class BigBlueButtonService:
    def __init__(self):
        self.enabled = settings.BBB_ENABLED
        self.base_url = settings.BBB_URL.rstrip('/')
        self.secret = settings.BBB_SECRET

    @property
    def mode(self):
        return 'live' if self.enabled else 'mock'

    @property
    def configured(self):
        return bool(self.base_url and self.secret)

    def check_connection(self):
        if not self.enabled:
            return True
        self._request('getMeetings', {})
        return True

    def create_meeting(self, *, meeting_id, name, record=False):
        if not self.enabled:
            return
        self._request('create', {
            'meetingID': meeting_id,
            'name': name,
            'record': str(record).lower(),
            'allowStartStopRecording': str(record).lower(),
            # Keep the classroom features explicit instead of depending on
            # server-wide defaults. BBB still asks each browser for media
            # permission when the user joins.
            'muteOnStart': 'false',
            'lockSettingsDisableCam': 'false',
            'lockSettingsDisableMic': 'false',
            'lockSettingsDisablePublicChat': 'false',
            'lockSettingsDisablePrivateChat': 'false',
            'multiUserWhiteboardEnabled': 'true',
        })

    def join_url(self, *, meeting_id, full_name, user_id, moderator=False, logout_url=''):
        if not self.enabled:
            return None
        params = {
            'meetingID': meeting_id,
            'fullName': full_name,
            'role': 'MODERATOR' if moderator else 'VIEWER',
            'userID': user_id,
            'redirect': 'true',
        }
        if logout_url:
            params['logoutURL'] = logout_url
        return self._signed_url('join', params)

    def end_meeting(self, *, meeting_id):
        if not self.enabled:
            return
        self._request('end', {'meetingID': meeting_id})

    def meeting_status(self, *, meeting_id):
        if not self.enabled:
            return {'running': True, 'participant_count': 0}
        running = self._request('isMeetingRunning', {'meetingID': meeting_id}).findtext('running') == 'true'
        if not running:
            return {'running': False, 'participant_count': 0}
        root = self._request('getMeetingInfo', {'meetingID': meeting_id})
        try:
            participant_count = int(root.findtext('participantCount') or 0)
        except ValueError:
            participant_count = 0
        return {'running': True, 'participant_count': participant_count}

    def _signed_url(self, call_name, params):
        if not self.base_url or not self.secret:
            raise BigBlueButtonError('BigBlueButton chưa được cấu hình đầy đủ.')
        query = urlencode(params)
        payload = f'{call_name}{query}{self.secret}'.encode()
        try:
            checksum = hashlib.new(settings.BBB_CHECKSUM_ALGORITHM, payload).hexdigest()
        except ValueError as exc:
            raise BigBlueButtonError('Thuật toán checksum BigBlueButton không hợp lệ.') from exc
        return f'{self.base_url}/{call_name}?{query}&checksum={checksum}'

    def _request(self, call_name, params):
        try:
            response = requests.get(
                self._signed_url(call_name, params),
                timeout=(settings.BBB_CONNECT_TIMEOUT, settings.BBB_TIMEOUT),
                verify=settings.BBB_SSL_VERIFY,
            )
            response.raise_for_status()
            root = ElementTree.fromstring(response.content)
        except (requests.RequestException, ElementTree.ParseError, ValueError) as exc:
            raise BigBlueButtonError('Không thể kết nối máy chủ BigBlueButton.') from exc

        if root.findtext('returncode') != 'SUCCESS':
            message = root.findtext('message') or 'BigBlueButton từ chối yêu cầu.'
            raise BigBlueButtonError(message)
        return root
