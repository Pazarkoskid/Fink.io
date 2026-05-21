from django.contrib import admin
from .models import Subject, Material, MaterialLike, MaterialDownload


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'year', 'semester', 'subject_type', 'created_at')
    list_filter = ('year', 'semester', 'subject_type', 'level')
    search_fields = ('name', 'code', 'description')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('title', 'uploaded_by', 'subject', 'visibility', 'status',
                    'downloads_count', 'likes_count', 'created_at')
    list_filter = ('visibility', 'status', 'extension', 'year', 'semester')
    search_fields = ('title', 'uploaded_by__email', 'uploaded_by__username')
    readonly_fields = ('file_size', 'extension', 'extracted_text',
                       'extraction_error', 'downloads_count', 'likes_count')


@admin.register(MaterialLike)
class MaterialLikeAdmin(admin.ModelAdmin):
    list_display = ('user', 'material', 'created_at')


@admin.register(MaterialDownload)
class MaterialDownloadAdmin(admin.ModelAdmin):
    list_display = ('user', 'material', 'created_at')

from .models import SavedMaterial as _SM
@admin.register(_SM)
class SavedMaterialAdmin(admin.ModelAdmin):
    list_display = ('user', 'material', 'created_at')
    search_fields = ('user__username', 'material__title')
