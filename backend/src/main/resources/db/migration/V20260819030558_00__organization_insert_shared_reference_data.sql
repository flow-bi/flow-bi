INSERT INTO teams (team_name)
SELECT seed.team_name
FROM (VALUES
    ('개발팀'),
    ('기획팀'),
    ('디자인팀'),
    ('인사팀'),
    ('마케팅팀')
) AS seed(team_name)
WHERE NOT EXISTS (
    SELECT 1
    FROM teams
    WHERE teams.team_name = seed.team_name
);

INSERT INTO positions (position_name)
SELECT seed.position_name
FROM (VALUES
    ('인턴'),
    ('사원'),
    ('대리'),
    ('과장'),
    ('차장'),
    ('부장')
) AS seed(position_name)
WHERE NOT EXISTS (
    SELECT 1
    FROM positions
    WHERE positions.position_name = seed.position_name
);
