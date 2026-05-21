"""Views: file a report (any user), process reports (moderators)."""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.accounts.permissions import IsModerator
from .models import Report
from .serializers import ReportCreateSerializer, ReportSerializer


class FileReportView(generics.CreateAPIView):
    """Authenticated users file a report."""
    queryset = Report.objects.all()
    serializer_class = ReportCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class ReportListView(generics.ListAPIView):
    """Moderators see the queue."""
    serializer_class = ReportSerializer
    permission_classes = [IsModerator]

    def get_queryset(self):
        qs = Report.objects.all()
        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        else:
            qs = qs.filter(status__in=['open', 'reviewing'])
        return qs


class ReportDetailView(generics.RetrieveUpdateAPIView):
    """Moderator updates report (status, note)."""
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsModerator]

    def perform_update(self, serializer):
        serializer.save(handled_by=self.request.user)


class TakeActionView(APIView):
    """
    Moderator action endpoint:
    POST /api/moderation/reports/<pk>/action/
    Body: { action: "remove_quiz"|"dismiss"|"resolve", note: str }
    """
    permission_classes = [IsModerator]

    def post(self, request, pk):
        report = get_object_or_404(Report, pk=pk)
        action = request.data.get('action')
        note = request.data.get('note', '')

        if action == 'remove_quiz':
            report.quiz.status = 'removed'
            report.quiz.save()
            report.status = 'resolved'
        elif action == 'dismiss':
            report.status = 'dismissed'
        elif action == 'resolve':
            report.status = 'resolved'
        else:
            return Response({'detail': 'Непозната акција.'},
                            status=status.HTTP_400_BAD_REQUEST)

        report.moderator_note = note
        report.handled_by = request.user
        report.save()
        return Response(ReportSerializer(report).data)
