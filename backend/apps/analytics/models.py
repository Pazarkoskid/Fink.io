"""
UserStats: aggregated, frequently-read user metrics.
Updated via signals whenever a QuizAttempt is created.
"""
from django.db import models
from django.conf import settings


class UserStats(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stats',
    )

    total_attempts = models.PositiveIntegerField(default=0)
    total_questions_answered = models.PositiveIntegerField(default=0)
    total_correct = models.PositiveIntegerField(default=0)

    # Sum of all (score * weight) — used to compute weighted average
    total_score_sum = models.FloatField(default=0)
    average_score = models.FloatField(default=0)

    # Highest score on a single attempt (0..100)
    best_score = models.FloatField(default=0)

    # Total fink-points: 1 point per correct answer, +bonus for perfect scores
    total_points = models.PositiveIntegerField(default=0)

    # Streaks
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_attempt_date = models.DateField(null=True, blank=True)

    # For instructors: how many quizzes they authored, total likes received
    quizzes_authored = models.PositiveIntegerField(default=0)
    likes_received = models.PositiveIntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-total_points']
        indexes = [
            models.Index(fields=['-total_points']),
            models.Index(fields=['-average_score']),
            models.Index(fields=['-total_attempts']),
        ]

    def __str__(self):
        return f"Stats: {self.user.username} ({self.total_points} pts)"
