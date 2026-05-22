"""
In-memory presence tracker for WebSocket connections.

Tracks which users are currently connected. For multi-instance production,
replace with Redis (channels-redis already supports this pattern).
"""
from threading import Lock
from collections import defaultdict


class Presence:
    def __init__(self):
        self._lock = Lock()
        # user_id -> count of open WS connections (a user can have multiple tabs)
        self._connections = defaultdict(int)

    def connect(self, user_id):
        """Returns True if this is the user's first connection (was offline)."""
        with self._lock:
            self._connections[user_id] += 1
            return self._connections[user_id] == 1

    def disconnect(self, user_id):
        """Returns True if user has no more connections (now offline)."""
        with self._lock:
            if user_id not in self._connections:
                return False
            self._connections[user_id] -= 1
            if self._connections[user_id] <= 0:
                del self._connections[user_id]
                return True
            return False

    def is_online(self, user_id):
        with self._lock:
            return user_id in self._connections

    def online_users(self):
        with self._lock:
            return set(self._connections.keys())


# Module-level singleton
presence = Presence()
