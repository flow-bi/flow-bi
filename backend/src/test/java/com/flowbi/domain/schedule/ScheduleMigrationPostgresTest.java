package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
class ScheduleMigrationPostgresTest {

  private static final String CALENDAR_BASELINE_VERSION = "20260812000002.00";

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @Test
  void appliesCalendarMigrationWithConstraintsAndIndexes() throws SQLException {
    String jdbcUrl = jdbcUrlFor("calendar_constraints");
    migrate(jdbcUrl).load().migrate();

    try (Connection connection = DriverManager.getConnection(jdbcUrl,POSTGRES.getUsername(),
        POSTGRES.getPassword())) {
      insertAuthenticationReferences(connection);
      connection.createStatement().execute("INSERT INTO projects (project_id) VALUES (20)");
      connection.createStatement().execute(
          "INSERT INTO schedules (title, schedule_type, visibility, start_at, end_at, creator_id, is_all_day, color_label, creator_attends) "
              + "VALUES ('existing', 'TEAM', 'TEAM', '2026-08-10T00:00:00Z', '2026-08-10T01:00:00Z', 1, false, 'BLUE', true)");
      connection.createStatement()
          .execute("INSERT INTO schedule_participants (schedule_id, user_id) VALUES (1, 2)");

      assertThatThrownBy(() -> connection.createStatement()
          .execute("INSERT INTO schedule_participants (schedule_id, user_id) VALUES (1, 2)"))
          .isInstanceOf(SQLException.class);
      assertThatThrownBy(() -> connection.createStatement().execute(
          "INSERT INTO schedules (title, schedule_type, visibility, start_at, end_at, creator_id, is_all_day, color_label, creator_attends) "
              + "VALUES ('invalid', 'PERSONAL', 'PRIVATE', '2026-08-10T01:00:00Z', '2026-08-10T00:00:00Z', 1, false, 'BLUE', true)"))
          .isInstanceOf(SQLException.class);
      assertThat(connection.getMetaData().getIndexInfo(null,null,"schedules",false,false).next())
          .isTrue();
    }
  }

  @Test
  void preservesAnInitialBaselineScheduleWhileApplyingTheCalendarConstraints() throws SQLException {
    String jdbcUrl = jdbcUrlFor("calendar_preservation");
    migrate(jdbcUrl).target(CALENDAR_BASELINE_VERSION).load().migrate();

    try (Connection connection = DriverManager.getConnection(jdbcUrl,POSTGRES.getUsername(),
        POSTGRES.getPassword())) {
      insertAuthenticationReferences(connection);
      connection.createStatement().execute(
          "INSERT INTO schedules (title, schedule_type, visibility, start_at, end_at, creator_id) "
              + "VALUES ('baseline', 'PERSONAL', 'PRIVATE', '2026-08-10T00:00:00Z', "
              + "'2026-08-10T01:00:00Z', 1)");
      connection.createStatement().execute(
          "INSERT INTO schedules_details (schedule_id, content, location) VALUES (1, 'keep', 'A')");
    }

    migrate(jdbcUrl).load().migrate();

    try (Connection connection = DriverManager.getConnection(jdbcUrl,POSTGRES.getUsername(),
        POSTGRES.getPassword())) {
      var result = connection.createStatement().executeQuery(
          "SELECT title, status, color_label, creator_attends FROM schedules WHERE schedule_id = 1");
      assertThat(result.next()).isTrue();
      assertThat(result.getString("title")).isEqualTo("baseline");
      assertThat(result.getString("status")).isEqualTo("ACTIVE");
      assertThat(result.getString("color_label")).isEqualTo("BLUE");
      assertThat(result.getBoolean("creator_attends")).isTrue();
      assertThat(connection.createStatement()
          .executeQuery("SELECT content FROM schedules_details WHERE schedule_id = 1").next())
          .isTrue();
    }
  }

  private static FluentConfiguration migrate(String jdbcUrl) {
    return Flyway.configure().dataSource(jdbcUrl,POSTGRES.getUsername(),POSTGRES.getPassword());
  }

  private static void insertAuthenticationReferences(Connection connection) throws SQLException {
    connection.createStatement()
        .execute("INSERT INTO positions (position_id, position_name) VALUES (1, 'Fixture')");
    connection.createStatement()
        .execute("INSERT INTO teams (team_id, team_name) VALUES (10, 'Fixture')");
    connection.createStatement()
        .execute("INSERT INTO users (user_id, position_id, team_id, employee_number, name) VALUES "
            + "(1, 1, 10, 'fixture-1', 'Fixture One'), "
            + "(2, 1, 10, 'fixture-2', 'Fixture Two')");
  }

  private static String jdbcUrlFor(String schema) throws SQLException {
    try (Connection connection = DriverManager.getConnection(POSTGRES.getJdbcUrl(),
        POSTGRES.getUsername(),POSTGRES.getPassword())) {
      connection.createStatement().execute("CREATE SCHEMA " + schema);
    }
    return POSTGRES.getJdbcUrl() + "&currentSchema=" + schema;
  }
}
