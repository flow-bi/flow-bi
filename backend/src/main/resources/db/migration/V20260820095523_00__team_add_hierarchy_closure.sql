ALTER TABLE teams
    ADD COLUMN parent_team_id BIGINT;

ALTER TABLE teams
    ADD CONSTRAINT fk_teams_parent_team
        FOREIGN KEY (parent_team_id) REFERENCES teams (team_id);

ALTER TABLE teams
    ADD CONSTRAINT ck_teams_parent_not_self
        CHECK (parent_team_id IS NULL OR parent_team_id <> team_id);

CREATE INDEX idx_teams_parent_team_id ON teams (parent_team_id);

CREATE UNIQUE INDEX uk_teams_root_normalized_name
    ON teams (lower(btrim(team_name)))
    WHERE parent_team_id IS NULL;

CREATE UNIQUE INDEX uk_teams_parent_normalized_name
    ON teams (parent_team_id, lower(btrim(team_name)))
    WHERE parent_team_id IS NOT NULL;

CREATE TABLE teams_closure (
    ancestor_team_id BIGINT NOT NULL,
    descendant_team_id BIGINT NOT NULL,
    depth INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_teams_closure PRIMARY KEY (ancestor_team_id, descendant_team_id),
    CONSTRAINT fk_teams_closure_ancestor
        FOREIGN KEY (ancestor_team_id) REFERENCES teams (team_id),
    CONSTRAINT fk_teams_closure_descendant
        FOREIGN KEY (descendant_team_id) REFERENCES teams (team_id),
    CONSTRAINT ck_teams_closure_depth
        CHECK ((ancestor_team_id = descendant_team_id AND depth = 0)
            OR (ancestor_team_id <> descendant_team_id AND depth > 0))
);

CREATE INDEX idx_teams_closure_ancestor_depth_descendant
    ON teams_closure (ancestor_team_id, depth, descendant_team_id);

CREATE INDEX idx_teams_closure_descendant_depth_ancestor
    ON teams_closure (descendant_team_id, depth, ancestor_team_id);

INSERT INTO teams_closure (ancestor_team_id, descendant_team_id, depth)
SELECT team_id, team_id, 0
FROM teams;
