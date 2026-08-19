package com.flowbi.domain.schedule.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.schedule.dto.ScheduleTargetOption;
import com.flowbi.domain.schedule.dto.ScheduleTargetOptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {"spring.datasource.driver-class-name=org.postgresql.Driver",
    "spring.jpa.hibernate.ddl-auto=validate",
    "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect"})
class ScheduleTargetOptionsPostgresTest {

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url",POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username",POSTGRES::getUsername);
    registry.add("spring.datasource.password",POSTGRES::getPassword);
  }

  @Autowired
  private JdbcScheduleIdentityAdapter adapter;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Test
  void returnsOnlyCurrentTeamAndActiveProjectMembershipInStableNameOrder() {
    insertUser(9801L,9811L);
    insertUser(9802L,9812L);
    insertProject(9821L,"Zulu","ACTIVE");
    insertProject(9822L,"Alpha","ACTIVE");
    insertProject(9823L,"Hidden","ACTIVE");
    insertProject(9824L,"Inactive","INACTIVE");
    jdbcTemplate.update("INSERT INTO projects_members (project_id, user_id) VALUES (9821, 9801)");
    jdbcTemplate.update("INSERT INTO projects_members (project_id, user_id) VALUES (9822, 9801)");
    jdbcTemplate.update("INSERT INTO projects_members (project_id, user_id) VALUES (9823, 9802)");
    jdbcTemplate.update("INSERT INTO projects_members (project_id, user_id) VALUES (9824, 9801)");

    ScheduleTargetOptions options = adapter.findTargetOptions(9801L);

    assertThat(options.teams()).containsExactly(new ScheduleTargetOption(9811L, "Team 9811"));
    assertThat(options.projects()).containsExactly(new ScheduleTargetOption(9822L, "Alpha"),
        new ScheduleTargetOption(9821L, "Zulu"));
  }

  private void insertProject(long projectId,String name,String status) {
    jdbcTemplate.update("INSERT INTO projects (project_id, project_name, status) VALUES (?, ?, ?)",
        projectId,name,status);
  }

  private void insertUser(long userId,long teamId) {
    jdbcTemplate.update("INSERT INTO positions (position_id, position_name) VALUES (?, ?)",userId,
        "Position " + userId);
    jdbcTemplate.update("INSERT INTO teams (team_id, team_name) VALUES (?, ?)",teamId,
        "Team " + teamId);
    jdbcTemplate.update("""
        INSERT INTO users (user_id, position_id, team_id, employee_number, email, name, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        """,userId,userId,teamId,"target-options-" + userId,
        "target-options-" + userId + "@example.test","User " + userId);
  }
}
