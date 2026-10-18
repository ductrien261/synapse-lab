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
    responses = list(run.responses.select_related('user').all())
    own_response = next((response for response in responses if response.user_id == user.id), None)
    response_count = len(responses)
    participant_count = run.session.attendances.exclude(
        user_id=run.session.classroom.owner_id,
    ).count()
    correct_count = sum(1 for response in responses if response.is_correct)
    payload = {
        'id': str(run.id),
        'status': run.status,
        'opened_at': run.opened_at.isoformat(),
        'closes_at': run.closes_at.isoformat(),
        'remaining_seconds': max(0, int((run.closes_at - now).total_seconds())),
        'response_count': response_count,
        'participant_count': participant_count,
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
            'correct_count': correct_count,
            'unanswered_count': max(0, participant_count - response_count),
            'accuracy_percent': round(correct_count * 100 / response_count) if response_count else 0,
            'response_rate_percent': round(response_count * 100 / participant_count) if participant_count else 0,
            'success_threshold': quiz.success_threshold,
            'meets_threshold': bool(response_count and correct_count * 100 / response_count >= quiz.success_threshold),
            'responses': [
                {
                    'user_id': str(response.user_id),
                    'name': response.user.full_name or response.user.email,
                    'email': response.user.email,
                    'selected_option': response.selected_option,
                    'is_correct': response.is_correct,
                    'submitted_at': response.submitted_at.isoformat(),
                }
                for response in responses
            ],
        }
    elif run.status == LiveQuizRun.Status.CLOSED:
        payload['correct_option'] = quiz.correct_option
        payload['is_correct'] = own_response.is_correct if own_response else None
    return payload


def serialize_quiz_report_run(run: LiveQuizRun) -> dict:
    quiz = run.quiz
    responses = list(run.responses.select_related('user').all())
    participant_count = run.session.attendances.exclude(
        user_id=run.session.classroom.owner_id,
    ).count()
    response_count = len(responses)
    correct_count = sum(1 for response in responses if response.is_correct)
    option_counts = [0 for _ in quiz.options]
    for response in responses:
        if response.selected_option < len(option_counts):
            option_counts[response.selected_option] += 1
    accuracy_percent = round(correct_count * 100 / response_count) if response_count else 0
    return {
        'id': str(run.id),
        'status': run.status,
        'opened_at': run.opened_at.isoformat(),
        'closed_at': run.closed_at.isoformat() if run.closed_at else None,
        'quiz': {
            'id': str(quiz.resource_id),
            'title': quiz.resource.title,
            'question': quiz.question,
            'options': quiz.options,
            'correct_option': quiz.correct_option,
            'success_threshold': quiz.success_threshold,
        },
        'participant_count': participant_count,
        'response_count': response_count,
        'unanswered_count': max(0, participant_count - response_count),
        'correct_count': correct_count,
        'accuracy_percent': accuracy_percent,
        'response_rate_percent': round(response_count * 100 / participant_count) if participant_count else 0,
        'meets_threshold': bool(response_count and correct_count * 100 / response_count >= quiz.success_threshold),
        'option_counts': option_counts,
        'responses': [
            {
                'user_id': str(response.user_id),
                'name': response.user.full_name or response.user.email,
                'email': response.user.email,
                'selected_option': response.selected_option,
                'is_correct': response.is_correct,
                'submitted_at': response.submitted_at.isoformat(),
            }
            for response in responses
        ],
    }
