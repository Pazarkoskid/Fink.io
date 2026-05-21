from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('me/', views.CurrentUserView.as_view(), name='me'),
    path('me/subjects/', views.UserSubjectListCreateView.as_view(), name='my-subjects'),
    path('me/subjects/<int:pk>/', views.UserSubjectDetailView.as_view(), name='my-subject-detail'),
    path('me/friend-requests/', views.MyFriendRequestsView.as_view(), name='my-friend-requests'),

    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:pk>/profile/', views.PublicProfileView.as_view(), name='user-profile'),
    path('users/<int:pk>/friends/', views.FriendsListView.as_view(), name='user-friends'),
    path('users/<int:pk>/friend-request/', views.SendFriendRequestView.as_view(), name='send-friend-request'),
    path('users/<int:pk>/friend/', views.RemoveFriendView.as_view(), name='remove-friend'),

    path('friend-requests/<int:pk>/respond/', views.RespondFriendRequestView.as_view(), name='respond-friend-request'),

    path('search/', views.UserSearchView.as_view(), name='user-search'),

    path('admin/users/', views.AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/role/', views.AdminUpdateRoleView.as_view(), name='admin-update-role'),
]
