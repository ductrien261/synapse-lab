from urllib.parse import urlencode, urljoin

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.urls import reverse
from django.utils import timezone

from .models import LiveQuizRun, LiveSession


BBB_QUIZ_TOKEN_SALT = 'classroom.bbb-quiz-runtime'


def build_bbb_quiz_runtime_url(session: LiveSession, user, *, moderator: bool) -> str:
    token = signing.dumps(
        {
            'session_id': str(session.id),
            'user_id': str(user.id),
            'moderator': moderator,
        },
        salt=BBB_QUIZ_TOKEN_SALT,
        compress=True,
    )
    path = reverse('bbb-quiz-runtime')
    base_url = settings.BBB_ASSET_BASE_URL.rstrip('/') + '/'
    return f'{urljoin(base_url, path.lstrip("/"))}?{urlencode({"token": token})}'


def resolve_bbb_quiz_participant(token: str):
    payload = signing.loads(
        token,
        salt=BBB_QUIZ_TOKEN_SALT,
        max_age=settings.BBB_QUIZ_TOKEN_TTL,
    )
    session = LiveSession.objects.select_related('classroom').get(pk=payload['session_id'])
    user = get_user_model().objects.get(pk=payload['user_id'])
    is_moderator = bool(payload.get('moderator')) and session.classroom.owner_id == user.id
    return session, user, is_moderator


def close_expired_quiz_runs(session: LiveSession) -> None:
    now = timezone.now()
    LiveQuizRun.objects.filter(
        session=session,
        status=LiveQuizRun.Status.OPEN,
        closes_at__lte=now,
    ).update(status=LiveQuizRun.Status.CLOSED, closed_at=now)


def serialize_quiz_run(run: LiveQuizRun, user, *, moderator: bool) -> dict:
    quiz = run.quiz
    now = timezone.now()
    responses = run.responses.all()
    own_response = responses.filter(user=user).first()
    payload = {
        'id': str(run.id),
        'status': run.status,
        'opened_at': run.opened_at.isoformat(),
        'closes_at': run.closes_at.isoformat(),
        'remaining_seconds': max(0, int((run.closes_at - now).total_seconds())),
        'response_count': responses.count(),
        'participant_count': run.session.attendances.exclude(
            user_id=run.session.classroom.owner_id,
        ).count(),
        'selected_option': own_response.selected_option if own_response else None,
        'quiz': {
            'id': str(quiz.resource_id),
            'title': quiz.resource.title,
            'question': quiz.question,
            'options': quiz.options,
            'duration_seconds': quiz.duration_seconds,
        },
    }
    if moderator:
        option_counts = [0 for _ in quiz.options]
        for response in responses:
            if response.selected_option < len(option_counts):
                option_counts[response.selected_option] += 1
        payload['results'] = {
            'correct_option': quiz.correct_option,
            'option_counts': option_counts,
            'correct_count': responses.filter(is_correct=True).count(),
        }
    elif run.status == LiveQuizRun.Status.CLOSED:
        payload['correct_option'] = quiz.correct_option
    return payload
