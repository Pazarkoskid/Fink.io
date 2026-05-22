from django.contrib import admin
from .models import Conversation, Message, ReadReceipt


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('key', 'last_message_at', 'last_message_preview', 'created_at')
    search_fields = ('key', 'participants__username')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'conversation', 'body', 'created_at')
    search_fields = ('sender__username', 'body')
    list_filter = ('created_at',)


@admin.register(ReadReceipt)
class ReadReceiptAdmin(admin.ModelAdmin):
    list_display = ('user', 'conversation', 'last_read_at')
