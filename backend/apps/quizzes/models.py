"""Quiz, Question, Choice, Attempt and Like models."""
from django.db import models
from django.conf import settings
from django.utils.text import slugify


class Quiz(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Нацрт'),
        ('published', 'Објавен'),
        ('removed', 'Отстранет'),
    ]
    VISIBILITY_CHOICES = [
        ('public', 'Јавно'),
        ('private', 'Приватно'),
        ('unlisted', 'Скриен линк'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, blank=True)
    description = models.TextField(blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='quizzes',
    )
    subject = models.ForeignKey(
        'materials.Subject', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quizzes',
    )
    source_material = models.ForeignKey(
        'materials.Material', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quizzes',
    )

    difficulty = models.PositiveSmallIntegerField(default=2)  # 1..3
    tags = models.JSONField(default=list, blank=True)
    estimated_minutes = models.PositiveIntegerField(default=10)

    # Denormalized from subject for fast filtering
    year = models.PositiveSmallIntegerField(null=True, blank=True, db_index=True)
    semester = models.PositiveSmallIntegerField(null=True, blank=True, db_index=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='public')

    ai_generated = models.BooleanField(default=False)
    ai_provider = models.CharField(max_length=50, blank=True)

    likes_count = models.PositiveIntegerField(default=0)
    plays_count = models.PositiveIntegerField(default=0)
    saves_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['author']),
            models.Index(fields=['-likes_count']),
            models.Index(fields=['year', 'semester']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            import secrets
            base = slugify(self.title) or 'kviz'
            suffix = secrets.token_hex(3)  # 6 hex chars = collision-free in practice
            self.slug = f"{base}-{suffix}"[:280]
        # Auto-fill year/semester from subject if not set
        if self.subject_id and (not self.year or not self.semester):
            subj = self.subject
            if subj:
                if not self.year:
                    self.year = subj.year
                if not self.semester:
                    self.semester = subj.semester
        super().save(*args, **kwargs)

    # Note: 'questions_count' is set by .annotate() in views; the serializer
    # falls back to .questions.count() when annotation is missing.


class Question(models.Model):
    QUESTION_TYPES = [
        ('single', 'Еден точен'),
        ('multiple', 'Повеќе точни'),
        ('essay', 'Есејско'),
    ]

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='single')
    explanation = models.TextField(blank=True)
    difficulty = models.PositiveSmallIntegerField(default=2)
    order = models.PositiveIntegerField(default=0)
    points = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.quiz.title[:30]} — {self.text[:50]}"


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    text = models.TextField()
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.text[:60]


class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'quiz']]


class SavedQuiz(models.Model):
    """User bookmarks a quiz to practice later."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='saved_quizzes',
    )
    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name='saved_by',
    )
    note = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'quiz']]
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', '-created_at'])]

    def __str__(self):
        return f"{self.user.username} → {self.quiz.title}"


class SavedQuiz(models.Model):
    """A quiz bookmarked by a student to keep in their library."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='saved_quizzes',
    )
    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE,
        related_name='saved_by',
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'quiz']]
        ordering = ['-saved_at']

    def __str__(self):
        return f"{self.user.username} → {self.quiz.title}"


class QuizAttempt(models.Model):
    """A single user's play-through of a quiz."""
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='attempts',
    )

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    score = models.FloatField(default=0)         # 0..100 percentage
    points_earned = models.PositiveIntegerField(default=0)
    points_total = models.PositiveIntegerField(default=0)

    answers = models.JSONField(default=dict, blank=True)
    # answers shape: { "<question_id>": {"choice_ids": [...], "text": "..."} }

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.user_id or 'anon'} → {self.quiz.title} ({self.score:.0f}%)"
