-- Audit log of outgoing mail. Used for the per-user daily sending cap.
-- Only metadata is stored (no message bodies).
CREATE TABLE sent_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  message_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_sent_log_user_time ON sent_log(user_id, created_at DESC);
