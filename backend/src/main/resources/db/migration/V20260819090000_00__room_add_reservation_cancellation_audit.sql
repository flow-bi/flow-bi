ALTER TABLE rooms_reservations ADD COLUMN cancelled_at TIMESTAMP WITHOUT TIME ZONE;

UPDATE rooms_reservations
SET cancelled_at = CURRENT_TIMESTAMP
WHERE status = 'CANCELED' AND cancelled_at IS NULL;

ALTER TABLE rooms_reservations
    ADD CONSTRAINT ck_room_reservations_cancellation_audit
    CHECK ((status = 'RESERVED' AND cancelled_at IS NULL)
        OR (status = 'CANCELED' AND cancelled_at IS NOT NULL));
