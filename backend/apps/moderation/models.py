"""Reports submitted against quizzes or specific questions."""
from django.db import models
from django.conf import settings


class Report(models.Model):
    REASON_CHOICES = [
        ('wrong_answer', 'Грешен точен одговор'),
        ('unclear', 'Нејасно прашање'),
        ('off_topic', 'Не е поврзано со материјалот'),
        ('offensive', 'Навредлива содржина'),
        ('copyright', 'Прекршување авторски права'),
        ('other', 'Друго'),
    ]

    STATUS_CHOICES = [
        ('open', 'Отворен'),
        ('reviewing', 'Се прегледува'),
        ('resolved', 'Решен'),
        ('dismissed', 'Отфрлен'),
    ]

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='filed_reports',
    )
    quiz = models.ForeignKey(
        'quizzes.Quiz', on_delete=models.CASCADE, related_name='reports',
    )
    question = models.ForeignKey(
        'quizzes.Question', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reports',
    )
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField(max_length=2000)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='handled_reports',
    )
    moderator_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status', '-created_at'])]

    def __str__(self):
        return f"Report #{self.id} on Quiz {self.quiz_id} ({self.status})"
