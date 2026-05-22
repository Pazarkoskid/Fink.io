from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.MyConversationsView.as_view(), name='conversations'),
    path('conversations/start/', views.StartConversationView.as_view(), name='conversation-start'),
    path('conversations/<int:pk>/messages/', views.ConversationMessagesView.as_view(), name='conversation-messages'),
    path('conversations/<int:pk>/read/', views.MarkReadView.as_view(), name='conversation-read'),
    path('unread-count/', views.UnreadCountView.as_view(), name='chat-unread-count'),
    path('online-friends/', views.OnlineFriendsView.as_view(), name='online-friends'),
]
