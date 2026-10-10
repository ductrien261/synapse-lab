from django.utils import timezone

from .models import LiveQuizRun, LiveSession


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
