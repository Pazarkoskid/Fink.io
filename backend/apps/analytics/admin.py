from django.contrib import admin
from .models import UserStats


@admin.register(UserStats)
class UserStatsAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_points', 'total_attempts',
                    'average_score', 'best_score', 'current_streak')
    list_filter = ('current_streak',)
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('updated_at',)
