"""Subjects (predmeti) and uploaded learning materials."""
import os
from django.db import models
from django.conf import settings


def upload_path(instance, filename):
    return f'materials/{instance.uploaded_by_id}/{filename}'


class Subject(models.Model):
    """A university subject. E.g., 'Алгоритми и податочни структури'."""

    YEAR_CHOICES = [
        (1, 'Прва година'),
        (2, 'Втора година'),
        (3, 'Трета година'),
        (4, 'Четврта година'),
    ]

    SEMESTER_CHOICES = [
        (1, 'Прв семестар'),
        (2, 'Втор семестар'),
        (3, 'Трет семестар'),
        (4, 'Четврти семестар'),
        (5, 'Петти семестар'),
        (6, 'Шести семестар'),
        (7, 'Седми семестар'),
        (8, 'Осми семестар'),
    ]

    SUBJECT_TYPE_CHOICES = [
        ('mandatory', 'Задолжителен'),
        ('elective', 'Изборен'),
    ]

    ELECTIVE_GROUP_CHOICES = [
        ('F23L1S', 'F23L1S — Изборни (прв циклус)'),
        ('F23L1W', 'F23L1W — Изборни (зимски)'),
        ('F23L2S', 'F23L2S — Изборни (втор циклус, летен)'),
        ('F23L2W', 'F23L2W — Изборни (втор циклус, зимски)'),
        ('F23L3S', 'F23L3S — Изборни (трет циклус, летен)'),
        ('F23L3W', 'F23L3W — Изборни (трет циклус, зимски)'),
    ]

    code = models.CharField(
        max_length=20, blank=True, db_index=True,
        help_text='Универзитетски код (пр. F23L1W004)'
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True)
    subject_type = models.CharField(
        max_length=20, choices=SUBJECT_TYPE_CHOICES, default='mandatory',
    )
    elective_group = models.CharField(
        max_length=20, choices=ELECTIVE_GROUP_CHOICES, blank=True,
    )
    prerequisites = models.TextField(blank=True, help_text='Предуслови (текст)')
    level = models.CharField(
        max_length=20,
        choices=[('bachelor', 'Бакалавр'), ('master', 'Магистер'), ('phd', 'Докторат')],
        default='bachelor',
    )
    year = models.PositiveSmallIntegerField(
        choices=YEAR_CHOICES, null=True, blank=True,
        help_text='Година на студии'
    )
    semester = models.PositiveSmallIntegerField(
        choices=SEMESTER_CHOICES, null=True, blank=True,
        help_text='Семестар (1-8)'
    )
    icon = models.CharField(max_length=50, blank=True, help_text='Emoji or short label')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['year', 'semester', 'name']
        indexes = [
            models.Index(fields=['year', 'semester']),
            models.Index(fields=['subject_type']),
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return f"{self.code} {self.name}" if self.code else self.name


class Material(models.Model):
    """An uploaded learning resource (PDF/DOCX/PPTX/TXT)."""

    STATUS_CHOICES = [
        ('uploaded', 'Прикачено'),
        ('extracting', 'Се обработува'),
        ('ready', 'Подготвено'),
        ('failed', 'Неуспешно'),
    ]
    VISIBILITY_CHOICES = [
        ('public', 'Јавно — секој може да го симне'),
        ('private', 'Приватно — само за мене'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, max_length=500)
    subject = models.ForeignKey(
        Subject, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='materials',
    )
    year = models.PositiveSmallIntegerField(
        choices=Subject.YEAR_CHOICES, null=True, blank=True,
    )
    semester = models.PositiveSmallIntegerField(
        choices=Subject.SEMESTER_CHOICES, null=True, blank=True,
    )
    file = models.FileField(upload_to=upload_path)
    file_size = models.PositiveIntegerField(default=0)
    extension = models.CharField(max_length=10, blank=True)

    extracted_text = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    extraction_error = models.TextField(blank=True)

    visibility = models.CharField(
        max_length=20, choices=VISIBILITY_CHOICES, default='public',
        db_index=True,
    )

    # Engagement counters
    downloads_count = models.PositiveIntegerField(default=0)
    likes_count = models.PositiveIntegerField(default=0)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='materials',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['visibility', '-created_at']),
            models.Index(fields=['-likes_count']),
            models.Index(fields=['-downloads_count']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.file and not self.file_size:
            try:
                self.file_size = self.file.size
            except Exception:
                pass
        if self.file and not self.extension:
            self.extension = os.path.splitext(self.file.name)[1].lower()
        # Auto-fill year/semester from subject
        if self.subject_id:
            subj = self.subject
            if subj:
                if not self.year and subj.year:
                    self.year = subj.year
                if not self.semester and subj.semester:
                    self.semester = subj.semester
        # Compute year from semester if still missing
        if self.semester and not self.year:
            self.year = (self.semester + 1) // 2
        super().save(*args, **kwargs)

    @property
    def has_text(self) -> bool:
        return bool(self.extracted_text and self.extracted_text.strip())


class MaterialLike(models.Model):
    """A user liked a material."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='material_likes',
    )
    material = models.ForeignKey(
        Material, on_delete=models.CASCADE,
        related_name='likes',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'material']]
        ordering = ['-created_at']


class MaterialDownload(models.Model):
    """Track who downloaded a material (analytics + don't double-count)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='material_downloads',
    )
    material = models.ForeignKey(
        Material, on_delete=models.CASCADE,
        related_name='downloads',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['material', '-created_at']),
        ]


class SavedMaterial(models.Model):
    """User bookmarks a material to find again later."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='saved_materials',
    )
    material = models.ForeignKey(
        Material, on_delete=models.CASCADE,
        related_name='saved_by',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'material']]
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', '-created_at'])]

    def __str__(self):
        return f"{self.user.username} → {self.material.title}"
