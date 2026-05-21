"""
Auto-update UserStats whenever a QuizAttempt is created or a Like is added.
Keeps the leaderboard fast — pre-aggregated reads instead of GROUP BY at request time.
"""
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta

from apps.quizzes.models import QuizAttempt, Quiz, Like
from .models import UserStats


def _get_or_create_stats(user):
    stats, _ = UserStats.objects.get_or_create(user=user)
    return stats


@receiver(post_save, sender=QuizAttempt)
def update_stats_on_attempt(sender, instance: QuizAttempt, created, **kwargs):
    """Update the user's aggregated stats when they finish a quiz."""
    if not created or instance.user_id is None:
        return
    if instance.finished_at is None:
        return

    with transaction.atomic():
        stats = _get_or_create_stats(instance.user)

        # Counts
        stats.total_attempts += 1
        stats.total_questions_answered += instance.points_total
        stats.total_correct += instance.points_earned

        # Score tracking
        stats.total_score_sum += instance.score
        stats.average_score = stats.total_score_sum / max(1, stats.total_attempts)
        stats.best_score = max(stats.best_score, instance.score)

        # Points: 1 per correct answer + perfect-score bonus
        earned = instance.points_earned
        if instance.score >= 100:
            earned += 5  # perfect-score bonus
        stats.total_points += earned

        # Streak tracking (day-based)
        today = timezone.localdate()
        if stats.last_attempt_date is None:
            stats.current_streak = 1
        elif stats.last_attempt_date == today:
            pass  # already counted today
        elif stats.last_attempt_date == today - timedelta(days=1):
            stats.current_streak += 1
        else:
            stats.current_streak = 1
        stats.longest_streak = max(stats.longest_streak, stats.current_streak)
        stats.last_attempt_date = today

        stats.save()


@receiver(post_save, sender=Quiz)
def update_stats_on_quiz_publish(sender, instance: Quiz, created, **kwargs):
    """Track quizzes authored count."""
    if instance.status != 'published':
        return
    stats = _get_or_create_stats(instance.author)
    stats.quizzes_authored = Quiz.objects.filter(
        author=instance.author, status='published'
    ).count()
    stats.save(update_fields=['quizzes_authored'])


@receiver(post_save, sender=Like)
def update_stats_on_like(sender, instance: Like, created, **kwargs):
    if not created:
        return
    stats = _get_or_create_stats(instance.quiz.author)
    stats.likes_received += 1
    stats.save(update_fields=['likes_received'])


@receiver(post_delete, sender=Like)
def update_stats_on_unlike(sender, instance: Like, **kwargs):
    try:
        stats = UserStats.objects.get(user=instance.quiz.author)
        stats.likes_received = max(0, stats.likes_received - 1)
        stats.save(update_fields=['likes_received'])
    except UserStats.DoesNotExist:
        pass
