from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserSubject, Friendship


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'role', 'current_year', 'is_active', 'created_at')
    list_filter = ('role', 'current_year', 'is_active', 'created_at')
    search_fields = ('email', 'username')
    ordering = ('-created_at',)

    fieldsets = UserAdmin.fieldsets + (
        ('Fink.io Profile', {
            'fields': ('role', 'bio', 'avatar', 'preferred_language',
                       'current_year', 'study_program'),
        }),
    )


@admin.register(UserSubject)
class UserSubjectAdmin(admin.ModelAdmin):
    list_display = ('user', 'subject', 'status', 'grade', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__username', 'subject__name', 'subject__code')


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ('requester', 'addressee', 'status', 'created_at', 'accepted_at')
    list_filter = ('status', 'created_at')
    search_fields = ('requester__username', 'addressee__username')
