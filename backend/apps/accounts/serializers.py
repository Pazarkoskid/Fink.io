"""Serializers for user accounts."""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import UserSubject

User = get_user_model()


class UserSubjectSerializer(serializers.ModelSerializer):
    subject_id = serializers.IntegerField(source='subject.id', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_year = serializers.IntegerField(source='subject.year', read_only=True)
    subject_semester = serializers.IntegerField(source='subject.semester', read_only=True)
    subject_icon = serializers.CharField(source='subject.icon', read_only=True)

    class Meta:
        model = UserSubject
        fields = ['id', 'subject', 'subject_id', 'subject_name', 'subject_code',
                  'subject_year', 'subject_semester', 'subject_icon',
                  'status', 'grade', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    """Public user info (used for profiles, quiz authors, etc.)."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'bio', 'avatar',
                  'preferred_language', 'current_year', 'study_program',
                  'status_label', 'status_emoji',
                  'created_at']
        read_only_fields = ['id', 'role', 'created_at']


class PublicUserSerializer(serializers.ModelSerializer):
    """Trimmed-down public view (no email)."""
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'bio', 'avatar',
                  'current_year', 'study_program',
                  'status_label', 'status_emoji',
                  'created_at']
        read_only_fields = fields

    def get_avatar(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        url = obj.avatar.url
        return request.build_absolute_uri(url) if request else url


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True,
                                     validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'role']
        extra_kwargs = {
            'role': {'required': False},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {"password": "Лозинките не се совпаѓаат."}
            )
        # Don't allow self-registration as moderator/admin
        if attrs.get('role') in ('moderator', 'admin'):
            raise serializers.ValidationError(
                {"role": "Не можете да се регистрирате со оваа улога."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'student'),
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """For users editing their own profile."""
    class Meta:
        model = User
        fields = ['username', 'bio', 'avatar', 'preferred_language',
                  'current_year', 'study_program',
                  'status_label', 'status_emoji']
