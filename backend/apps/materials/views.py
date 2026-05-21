"""Views for subjects and materials."""
from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import F, Count

from apps.accounts.permissions import IsOwnerOrReadOnly
from apps.ai_service.services import extract_text
from .models import Subject, Material, MaterialLike, MaterialDownload, SavedMaterial
from .serializers import SubjectSerializer, MaterialSerializer, MaterialUploadSerializer


# =========================
#   Subjects
# =========================

class SubjectListView(generics.ListCreateAPIView):
    """List all subjects (public) or create one (admin)."""
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'code']
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        year = self.request.query_params.get('year')
        semester = self.request.query_params.get('semester')
        subject_type = self.request.query_params.get('subject_type')
        if year:
            qs = qs.filter(year=year)
        if semester:
            qs = qs.filter(semester=semester)
        if subject_type:
            qs = qs.filter(subject_type=subject_type)
        return qs

    def perform_create(self, serializer):
        if not self.request.user.is_admin_role:
            self.permission_denied(self.request)
        serializer.save()


class SubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# =========================
#   Materials — public catalog (DATABASES)
# =========================

class PublicMaterialListView(generics.ListAPIView):
    """
    PUBLIC catalog of materials (databases page).
    Anyone can browse. Only 'public' materials with status=ready visible.
    """
    serializer_class = MaterialSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'subject__name', 'uploaded_by__username']
    ordering_fields = ['created_at', 'downloads_count', 'likes_count']
    ordering = ['-likes_count', '-created_at']

    def get_queryset(self):
        qs = Material.objects.filter(visibility='public', status='ready')

        subject = self.request.query_params.get('subject')
        if subject:
            qs = qs.filter(subject_id=subject)

        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)

        semester = self.request.query_params.get('semester')
        if semester:
            qs = qs.filter(semester=semester)

        ext = self.request.query_params.get('extension')
        if ext:
            qs = qs.filter(extension=ext if ext.startswith('.') else f'.{ext}')

        return qs


class UserMaterialsView(generics.ListAPIView):
    """Materials uploaded by a specific user (only public ones)."""
    serializer_class = MaterialSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return Material.objects.filter(
            uploaded_by_id=user_id,
            visibility='public',
            status='ready',
        ).order_by('-created_at')


# =========================
#   Materials — own (CRUD)
# =========================

class MaterialListCreateView(generics.ListCreateAPIView):
    """
    GET: list the current user's own materials (all visibilities, all statuses).
    POST: upload a new material (any authenticated user now, not just instructors).
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MaterialUploadSerializer
        return MaterialSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_role:
            return Material.objects.all()
        return Material.objects.filter(uploaded_by=user)

    def create(self, request, *args, **kwargs):
        # OPENED: any authenticated user can upload (was: only instructors)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        material = serializer.save(uploaded_by=request.user)

        material.status = 'extracting'
        material.save(update_fields=['status'])
        try:
            text = extract_text(material.file.path)
            if text:
                material.extracted_text = text
                material.status = 'ready'
            else:
                material.status = 'failed'
                material.extraction_error = 'Не успеа да се извлече текст од документот.'
        except Exception as e:
            material.status = 'failed'
            material.extraction_error = str(e)[:500]
        material.save()

        return Response(
            MaterialSerializer(material, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class MaterialDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: anyone can read PUBLIC materials. Owner/admin can read private ones.
    PATCH/DELETE: owner only.
    """
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_serializer_context(self):
        return {'request': self.request}

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Private materials only visible to owner/admin
        if instance.visibility == 'private':
            user = request.user
            if not user.is_authenticated or (
                user != instance.uploaded_by and not user.is_admin_role
            ):
                return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MaterialReExtractView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def post(self, request, pk):
        material = get_object_or_404(Material, pk=pk)
        self.check_object_permissions(request, material)
        material.status = 'extracting'
        material.extraction_error = ''
        material.save()
        try:
            text = extract_text(material.file.path)
            if text:
                material.extracted_text = text
                material.status = 'ready'
            else:
                material.status = 'failed'
                material.extraction_error = 'Празен резултат.'
        except Exception as e:
            material.status = 'failed'
            material.extraction_error = str(e)[:500]
        material.save()
        return Response(MaterialSerializer(material, context={'request': request}).data)


# =========================
#   Likes & downloads
# =========================

class ToggleMaterialLikeView(APIView):
    """Like/unlike a material."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            material = Material.objects.get(pk=pk, visibility='public')
        except Material.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        like, created = MaterialLike.objects.get_or_create(
            user=request.user, material=material,
        )
        if not created:
            like.delete()
            Material.objects.filter(pk=material.pk).update(
                likes_count=F('likes_count') - 1
            )
            material.refresh_from_db()
            return Response({'liked': False, 'likes_count': material.likes_count})

        Material.objects.filter(pk=material.pk).update(
            likes_count=F('likes_count') + 1
        )
        material.refresh_from_db()
        return Response({'liked': True, 'likes_count': material.likes_count})


class TrackDownloadView(APIView):
    """
    Called when a user wants to download a public material.
    Increments downloads_count, records the event, and returns the file URL.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            material = Material.objects.get(pk=pk, visibility='public', status='ready')
        except Material.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Track download
        MaterialDownload.objects.create(
            user=request.user if request.user.is_authenticated else None,
            material=material,
        )
        Material.objects.filter(pk=material.pk).update(
            downloads_count=F('downloads_count') + 1
        )
        material.refresh_from_db()

        # Return absolute file URL
        url = material.file.url
        if request:
            url = request.build_absolute_uri(url)

        return Response({
            'url': url,
            'filename': material.file.name.split('/')[-1],
            'downloads_count': material.downloads_count,
        })


class ToggleSaveMaterialView(APIView):
    """Save / unsave a material (bookmark)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            material = Material.objects.get(pk=pk, visibility='public', status='ready')
        except Material.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        saved, created = SavedMaterial.objects.get_or_create(
            user=request.user, material=material,
        )
        if not created:
            saved.delete()
            return Response({'saved': False})
        return Response({'saved': True})


class MySavedMaterialsView(generics.ListAPIView):
    """List materials I've saved."""
    serializer_class = MaterialSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        saved_ids = SavedMaterial.objects.filter(
            user=self.request.user
        ).values_list('material_id', flat=True)
        return Material.objects.filter(
            id__in=saved_ids, visibility='public', status='ready'
        ).order_by('-created_at')

    def get_serializer_context(self):
        return {'request': self.request}
