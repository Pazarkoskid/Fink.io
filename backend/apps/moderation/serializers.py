"""Serializers for Reports."""
from rest_framework import serializers
from .models import Report


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['quiz', 'question', 'reason', 'description']


class ReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source='reporter.username',
                                              read_only=True, default='')
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    handled_by_username = serializers.CharField(source='handled_by.username',
                                                read_only=True, default='')

    class Meta:
        model = Report
        fields = ['id', 'reporter', 'reporter_username', 'quiz', 'quiz_title',
                  'question', 'reason', 'description', 'status',
                  'handled_by', 'handled_by_username', 'moderator_note',
                  'created_at', 'updated_at']
        read_only_fields = ['reporter', 'handled_by', 'created_at', 'updated_at']
