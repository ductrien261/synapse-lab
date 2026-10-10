from datetime import timedelta

import jwt
import requests
from django.conf import settings
from django.utils import timezone


def create_video_token(user, room_name):
    now = timezone.now()
    return jwt.encode({
        'iss': settings.LIVEKIT_API_KEY,
        'sub': str(user.id),
        'name': user.full_name or user.email,
        'iat': int(now.timestamp()),
        'nbf': int(now.timestamp()),
        'exp': int((now + timedelta(hours=2)).timestamp()),
        'video': {
            'roomJoin': True,
            'room': room_name,
            'canPublish': True,
            'canSubscribe': True,
        },
    }, settings.LIVEKIT_API_SECRET, algorithm='HS256')


def delete_room(room_name):
    now = timezone.now()
    token = jwt.encode({
        'iss': settings.LIVEKIT_API_KEY,
        'sub': 'synapse-backend',
        'iat': int(now.timestamp()),
        'nbf': int(now.timestamp()),
        'exp': int((now + timedelta(minutes=5)).timestamp()),
        'video': {'roomCreate': True},
    }, settings.LIVEKIT_API_SECRET, algorithm='HS256')
    response = requests.post(
        f"{settings.LIVEKIT_API_URL.rstrip('/')}/twirp/livekit.RoomService/DeleteRoom",
        json={'room': room_name},
        headers={'Authorization': f'Bearer {token}'},
        timeout=5,
    )
    if response.status_code != 404:
        response.raise_for_status()
