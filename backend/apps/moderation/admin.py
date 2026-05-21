from django.contrib import admin
from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'quiz', 'reporter', 'reason', 'status', 'created_at')
    list_filter = ('status', 'reason')
    search_fields = ('quiz__title', 'reporter__email', 'description')
