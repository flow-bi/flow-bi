ALTER TABLE users
    ADD COLUMN email VARCHAR(255);

ALTER TABLE users
    ADD COLUMN phone_number VARCHAR(20);

ALTER TABLE users
    ADD COLUMN profile_image_url VARCHAR(512);

ALTER TABLE users
    ALTER COLUMN email SET NOT NULL;

ALTER TABLE users
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT uk_users_email UNIQUE (email);

ALTER TABLE users
    ADD CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'INACTIVE'));
