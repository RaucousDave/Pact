ALTER TABLE creators
    ADD CONSTRAINT creators_email_unique UNIQUE (email),
    ADD CONSTRAINT creators_handle_unique UNIQUE (handle);
