"""Serializers for materials and subjects."""
import os
from rest_framework import serializers
from django.conf import settings
from .models import Subject, Material, MaterialLike, SavedMaterial


class SubjectSerializer(serializers.ModelSerializer):
    materials_count = serializers.SerializerMethodField()
    quizzes_count = serializers.SerializerMethodField()
    year_display = serializers.CharField(source='get_year_display', read_only=True)
    semester_display = serializers.CharField(source='get_semester_display', read_only=True)
    subject_type_display = serializers.CharField(source='get_subject_type_display', read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'code', 'name', 'slug', 'description', 'level',
                  'subject_type', 'subject_type_display', 'elective_group',
                  'prerequisites',
                  'year', 'year_display', 'semester', 'semester_display',
                  'icon', 'materials_count', 'quizzes_count']

    def get_materials_count(self, obj):
        return obj.materials.filter(visibility='public').count()

    def get_quizzes_count(self, obj):
        from apps.quizzes.models import Quiz
        return Quiz.objects.filter(subject=obj, status='published').count()


class MaterialSerializer(serializers.ModelSerializer):
    """Full info — used for owner's own list and editing."""
    uploaded_by_username = serializers.CharField(
        source='uploaded_by.username', read_only=True
    )
    uploaded_by_avatar = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_year = serializers.IntegerField(source='subject.year', read_only=True)
    subject_semester = serializers.IntegerField(source='subject.semester', read_only=True)
    has_text = serializers.BooleanField(read_only=True)
    liked = serializers.SerializerMethodField()
    saved = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = ['id', 'title', 'description',
                  'subject', 'subject_name', 'subject_code',
                  'subject_year', 'subject_semester',
                  'year', 'semester',
                  'file', 'file_size', 'extension', 'status',
                  'extraction_error', 'visibility',
                  'downloads_count', 'likes_count', 'liked', 'saved',
                  'uploaded_by', 'uploaded_by_username', 'uploaded_by_avatar',
                  'has_text', 'created_at']
        read_only_fields = ['file_size', 'extension', 'status',
                            'extraction_error', 'uploaded_by', 'created_at',
                            'downloads_count', 'likes_count']

    def get_uploaded_by_avatar(self, obj):
        if obj.uploaded_by and obj.uploaded_by.avatar:
            request = self.context.get('request')
            url = obj.uploaded_by.avatar.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return MaterialLike.objects.filter(material=obj, user=request.user).exists()

    def get_saved(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return SavedMaterial.objects.filter(material=obj, user=request.user).exists()


class MaterialUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = ['title', 'description', 'subject', 'semester', 'visibility', 'file']

    def validate(self, attrs):
        subject = attrs.get('subject')
        semester = attrs.get('semester')
        if not semester and subject and subject.semester:
            attrs['semester'] = subject.semester
        if not attrs.get('semester'):
            raise serializers.ValidationError({
                'semester': 'Семестарот е задолжителен.'
            })
        return attrs

    def validate_file(self, f):
        ext = os.path.splitext(f.name)[1].lower()
        if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
            raise serializers.ValidationError(
                f"Форматот {ext} не е поддржан. "
                f"Дозволени: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}"
            )
        if f.size > settings.FILE_UPLOAD_MAX_MEMORY_SIZE:
            raise serializers.ValidationError(
                f"Фајлот е преголем (макс. {settings.FILE_UPLOAD_MAX_MEMORY_SIZE // (1024*1024)} MB)."
            )
        return f
