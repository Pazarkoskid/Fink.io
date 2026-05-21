"""Permission classes that map to the 5 roles."""
from rest_framework import permissions


class IsInstructor(permissions.BasePermission):
    """Allow instructors and admins."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_instructor)


class IsModerator(permissions.BasePermission):
    """Allow moderators and admins."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_moderator)


class IsAdminRole(permissions.BasePermission):
    """Allow only admins (not Django's is_staff)."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_admin_role)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Read for all, write only for the object's owner."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Try common author fields
        for attr in ('author', 'created_by', 'user', 'owner'):
            if hasattr(obj, attr):
                return getattr(obj, attr) == request.user
        return False


class IsOwnerOrModerator(permissions.BasePermission):
    """Read for all, write for owner OR moderator/admin."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_authenticated and request.user.is_moderator:
            return True
        for attr in ('author', 'created_by', 'user'):
            if hasattr(obj, attr):
                return getattr(obj, attr) == request.user
        return False
