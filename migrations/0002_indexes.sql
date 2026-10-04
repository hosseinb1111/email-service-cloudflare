CREATE INDEX idx_emails_recipient_time   ON emails(recipient_address, received_at DESC);
CREATE INDEX idx_emails_recipient_vis    ON emails(recipient_address, is_deleted, received_at DESC);
CREATE INDEX idx_addresses_user          ON addresses(user_id);
CREATE INDEX idx_sessions_user           ON sessions(user_id);
CREATE INDEX idx_sessions_expires        ON sessions(expires_at);
