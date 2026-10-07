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

    def create_meeting(self, *, meeting_id, name, record=False, presentations=None):
        if not self.enabled:
            return
        params = {
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
        }
        body = self._presentation_body(presentations or [])
        self._request('create', params, body=body) if body else self._request('create', params)

    def insert_documents(self, *, meeting_id, presentations):
        if not self.enabled:
            return
        body = self._presentation_body(presentations)
        if body:
            self._request('insertDocument', {'meetingID': meeting_id}, body=body)

    def join_url(self, *, meeting_id, full_name, user_id, moderator=False, logout_url='', user_data=None):
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
        for key, value in (user_data or {}).items():
            if value:
                params[f'userdata-{key}'] = value
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

    def _request(self, call_name, params, *, body=None):
        try:
            request_kwargs = {
                'timeout': (settings.BBB_CONNECT_TIMEOUT, settings.BBB_TIMEOUT),
                'verify': settings.BBB_SSL_VERIFY,
            }
            if body:
                response = requests.post(
                    self._signed_url(call_name, params),
                    data=body,
                    headers={'Content-Type': 'application/xml'},
                    **request_kwargs,
                )
            else:
                response = requests.get(self._signed_url(call_name, params), **request_kwargs)
            response.raise_for_status()
            root = ElementTree.fromstring(response.content)
        except (requests.RequestException, ElementTree.ParseError, ValueError) as exc:
            raise BigBlueButtonError('Không thể kết nối máy chủ BigBlueButton.') from exc

        if root.findtext('returncode') != 'SUCCESS':
            message = root.findtext('message') or 'BigBlueButton từ chối yêu cầu.'
            raise BigBlueButtonError(message)
        return root

    @staticmethod
    def _presentation_body(presentations):
        if not presentations:
            return None
        modules = ElementTree.Element('modules')
        module = ElementTree.SubElement(modules, 'module', {'name': 'presentation'})
        for index, presentation in enumerate(presentations):
            attributes = {
                'url': str(presentation['url']),
                'filename': str(presentation['filename']),
                'downloadable': str(bool(presentation.get('downloadable', False))).lower(),
                'removable': str(bool(presentation.get('removable', False))).lower(),
                'current': str(bool(presentation.get('current', index == 0))).lower(),
            }
            ElementTree.SubElement(module, 'document', attributes)
        return ElementTree.tostring(modules, encoding='utf-8', xml_declaration=True)
