package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.flowbi.domain.schedule.port.InvalidScheduleReferenceException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
class ScheduleUserIntegrationTest {

  @Autowired
  private JdbcScheduleIdentityAdapter adapter;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Test
  void resolvesCurrentTeamAndProjectMembershipAndRejectsInaccessibleTargets() {
    insertUser(9501L,9591L,"ACTIVE");
    insertUser(9502L,9592L,"ACTIVE");
    jdbcTemplate.update(
        "INSERT INTO projects (project_id, project_name, status) VALUES (9510, 'Calendar', 'ACTIVE')");
    jdbcTemplate.update("INSERT INTO projects_members (project_id, user_id) VALUES (9510, 9501)");

    assertThat(adapter.memberTeamIds(9501L,Set.of(9591L,9592L))).containsExactly(9591L);
    assertThat(adapter.memberProjectIds(9501L,Set.of(9510L))).containsExactly(9510L);
    assertThat(adapter.memberProjectIds(9502L,Set.of(9510L))).isEmpty();

    ScheduleCreateCommand inaccessible = command(9502L,List.of(9510L));
    assertThatThrownBy(() -> adapter.validateForCreation(inaccessible))
        .isInstanceOf(InvalidScheduleReferenceException.class);
  }

  private ScheduleCreateCommand command(long creatorId,List<Long> projectIds) {
    return ScheduleCreateCommand.of(creatorId,"Project",ScheduleType.PROJECT,
        ScheduleVisibility.PROJECT,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,"","",true,
        List.of(),List.of(),List.of(),projectIds);
  }

  private void insertUser(long userId,long teamId,String status) {
    jdbcTemplate.update("INSERT INTO positions (position_id, position_name) VALUES (?, ?)",userId,
        "Position " + userId);
    jdbcTemplate.update("INSERT INTO teams (team_id, team_name) VALUES (?, ?)",teamId,
        "Team " + teamId);
    jdbcTemplate.update("""
        INSERT INTO users (user_id, position_id, team_id, employee_number, email, name, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,userId,userId,teamId,"user-integration-" + userId,
        "user-integration-" + userId + "@example.test","User " + userId,status);
  }
}
