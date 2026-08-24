DO $$
DECLARE
    target_team_id BIGINT;
    target_position_id BIGINT;
    team_matches INTEGER;
    position_matches INTEGER;
    seed RECORD;
    existing_matches INTEGER;
BEGIN
    SELECT COUNT(*), MIN(team_id)
    INTO team_matches, target_team_id
    FROM teams
    WHERE team_name = '개발팀';

    IF team_matches <> 1 THEN
        RAISE EXCEPTION 'Calendar attendee data requires exactly one 개발팀';
    END IF;

    SELECT COUNT(*), MIN(position_id)
    INTO position_matches, target_position_id
    FROM positions
    WHERE position_name = '사원';

    IF position_matches <> 1 THEN
        RAISE EXCEPTION 'Calendar attendee data requires exactly one 사원 position';
    END IF;

    PERFORM setval(
        pg_get_serial_sequence('users', 'user_id'),
        COALESCE((SELECT MAX(user_id) FROM users), 1),
        (SELECT COUNT(*) > 0 FROM users)
    );

    FOR seed IN
        SELECT *
        FROM (VALUES
            ('CAL-ATTENDEE-TEST-001', 'alpha@calendar-attendee.test', '김안녕'),
            ('CAL-ATTENDEE-TEST-002', 'bravo@calendar-attendee.test', '박잘가'),
            ('CAL-ATTENDEE-TEST-003', 'charlie@calendar-attendee.test', '최반갑')
        ) AS data(employee_number, email, name)
    LOOP
        SELECT COUNT(*)
        INTO existing_matches
        FROM users
        WHERE employee_number = seed.employee_number OR email = seed.email;

        IF existing_matches = 0 THEN
            INSERT INTO users (position_id, team_id, employee_number, email, name, status)
            VALUES (target_position_id, target_team_id, seed.employee_number, seed.email, seed.name,
                'ACTIVE');
        ELSIF existing_matches = 1 AND EXISTS (
            SELECT 1
            FROM users
            WHERE employee_number = seed.employee_number
              AND email = seed.email
              AND name = seed.name
              AND status = 'ACTIVE'
              AND team_id = target_team_id
              AND position_id = target_position_id
        ) THEN
            CONTINUE;
        ELSE
            RAISE EXCEPTION 'Calendar attendee data conflicts with existing user identifier';
        END IF;
    END LOOP;
END
$$;
