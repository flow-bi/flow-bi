package com.flowbi.domain.schedule.repository;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.service.*;

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
  private static final String BEFORE_ATTENDEE_DATA_VERSION = "20260820095523.00";
  private static final String[] ATTENDEE_EMPLOYEE_NUMBERS = {"CAL-ATTENDEE-TEST-001",
      "CAL-ATTENDEE-TEST-002", "CAL-ATTENDEE-TEST-003"};
  private static final String[] ATTENDEE_NAMES = {"김안녕", "박잘가", "최반갑"};

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @Test
  void appliesCalendarMigrationWithConstraintsAndIndexes() throws SQLException {
    String jdbcUrl = jdbcUrlFor("calendar_constraints");
    migrate(jdbcUrl).load().migrate();

    try (Connection connection = DriverManager.getConnection(jdbcUrl,POSTGRES.getUsername(),
        POSTGRES.getPassword())) {
      insertAuthenticationReferences(connection,true);
      connection.createStatement().execute("INSERT INTO projects (project_id) VALUES (20)");
      connection.createStatement().execute(
          "INSERT INTO schedules (title, schedule_type, visibility, start_at, end_at, creator_id, is_all_day, color_label, creator_attends) "
              + "VALUES ('existing', 'TEAM', 'TEAM', '2026-08-10T00:00:00Z', '2026-08-10T01:00:00Z', 1001, false, 'BLUE', true)");
      connection.createStatement()
          .execute("INSERT INTO schedule_participants (schedule_id, user_id) VALUES (1, 1002)");

      assertThatThrownBy(() -> connection.createStatement()
          .execute("INSERT INTO schedule_participants (schedule_id, user_id) VALUES (1, 1002)"))
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
      insertAuthenticationReferences(connection,false);
      connection.createStatement().execute(
          "INSERT INTO schedules (title, schedule_type, visibility, start_at, end_at, creator_id) "
              + "VALUES ('baseline', 'PERSONAL', 'PRIVATE', '2026-08-10T00:00:00Z', "
              + "'2026-08-10T01:00:00Z', 1001)");
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
      var migratedUsers = connection.createStatement()
          .executeQuery("SELECT email, status FROM users ORDER BY user_id");
      assertThat(migratedUsers.next()).isTrue();
      assertThat(migratedUsers.getString("email")).isEqualTo("fixture-1@migration.invalid");
      assertThat(migratedUsers.getString("status")).isEqualTo("ACTIVE");
      assertThat(migratedUsers.next()).isTrue();
      assertThat(migratedUsers.getString("email")).isEqualTo("fixture-2@migration.invalid");
      assertThat(migratedUsers.getString("status")).isEqualTo("ACTIVE");
    }
  }

  @Test
  void addsThreeActiveNonAuthenticatingSyntheticAttendeesWithReferenceForeignKeys()
      throws SQLException {
    String jdbcUrl = jdbcUrlFor("calendar_attendee_seed_data");
    migrate(jdbcUrl).load().migrate();

    try (Connection connection = DriverManager.getConnection(jdbcUrl,POSTGRES.getUsername(),
        POSTGRES.getPassword())) {
      var attendees = connection.createStatement().executeQuery("""
          SELECT u.employee_number, u.email, u.name, u.status, t.team_name, p.position_name
          FROM users u
          JOIN teams t ON t.team_id = u.team_id
          JOIN positions p ON p.position_id = u.position_id
          WHERE u.employee_number LIKE 'CAL-ATTENDEE-TEST-%'
          ORDER BY u.employee_number
          """);

      for (int index = 0; index < ATTENDEE_EMPLOYEE_NUMBERS.length; index++) {
        assertThat(attendees.next()).isTrue();
        assertThat(attendees.getString("employee_number"))
            .isEqualTo(ATTENDEE_EMPLOYEE_NUMBERS[index]);
        assertThat(attendees.getString("email")).endsWith("@calendar-attendee.test");
        assertThat(attendees.getString("name")).isEqualTo(ATTENDEE_NAMES[index]);
        assertThat(attendees.getString("status")).isEqualTo("ACTIVE");
        assertThat(attendees.getString("team_name")).isEqualTo("개발팀");
        assertThat(attendees.getString("position_name")).isEqualTo("사원");
      }
      assertThat(attendees.next()).isFalse();
      var distinctIdentifiers = connection.createStatement().executeQuery("""
          SELECT COUNT(*), COUNT(DISTINCT employee_number), COUNT(DISTINCT email)
          FROM users
          WHERE employee_number LIKE 'CAL-ATTENDEE-TEST-%'
          """);
      assertThat(distinctIdentifiers.next()).isTrue();
      assertThat(distinctIdentifiers.getInt(1)).isEqualTo(3);
      assertThat(distinctIdentifiers.getInt(2)).isEqualTo(3);
      assertThat(distinctIdentifiers.getInt(3)).isEqualTo(3);
      var credentials = connection.createStatement().executeQuery("""
          SELECT COUNT(*)
          FROM user_credentials c
          JOIN users u ON u.user_id = c.user_id
          WHERE u.employee_number LIKE 'CAL-ATTENDEE-TEST-%'
          """);
      assertThat(credentials.next()).isTrue();
      assertThat(credentials.getInt(1)).isZero();
    }
  }

  @Test
  void preservesExistingRowsAndValidatesWhenAttendeeDataIsAppliedIncrementally()
      throws SQLException {
    String jdbcUrl = jdbcUrlFor("calendar_attendee_incremental");
    migrate(jdbcUrl).target(BEFORE_ATTENDEE_DATA_VERSION).load().migrate();

    try (Connection connection = DriverManager.getConnection(jdbcUrl,POSTGRES.getUsername(),
        POSTGRES.getPassword())) {
      insertAuthenticationReferences(connection,true);
    }

    Flyway flyway = migrate(jdbcUrl).load();
    int appliedBefore = flyway.info().applied().length;
    assertThat(flyway.migrate().migrationsExecuted).isEqualTo(1);
    flyway.validate();
    assertThat(flyway.info().applied()).hasSize(appliedBefore + 1);
    assertThat(flyway.migrate().migrationsExecuted).isZero();

    try (Connection connection = DriverManager.getConnection(jdbcUrl,POSTGRES.getUsername(),
        POSTGRES.getPassword())) {
      var existingUsers = connection.createStatement().executeQuery("""
          SELECT employee_number, email FROM users
          WHERE employee_number IN ('fixture-1', 'fixture-2') ORDER BY employee_number
          """);
      assertThat(existingUsers.next()).isTrue();
      assertThat(existingUsers.getString("email")).isEqualTo("fixture-1@example.test");
      assertThat(existingUsers.next()).isTrue();
      assertThat(existingUsers.getString("email")).isEqualTo("fixture-2@example.test");
      assertThat(existingUsers.next()).isFalse();
      var referenceRows = connection.createStatement().executeQuery("""
          SELECT
              (SELECT COUNT(*) FROM teams WHERE team_name = '개발팀'),
              (SELECT COUNT(*) FROM positions WHERE position_name = '사원')
          """);
      assertThat(referenceRows.next()).isTrue();
      assertThat(referenceRows.getInt(1)).isEqualTo(1);
      assertThat(referenceRows.getInt(2)).isEqualTo(1);
      var seededCount = connection.createStatement().executeQuery("""
          SELECT COUNT(*) FROM users WHERE employee_number LIKE 'CAL-ATTENDEE-TEST-%'
          """);
      assertThat(seededCount.next()).isTrue();
      assertThat(seededCount.getInt(1)).isEqualTo(3);
    }
  }

  private static FluentConfiguration migrate(String jdbcUrl) {
    return Flyway.configure().dataSource(jdbcUrl,POSTGRES.getUsername(),POSTGRES.getPassword());
  }

  private static void insertAuthenticationReferences(Connection connection,boolean emailRequired)
      throws SQLException {
    long positionId = referenceId(connection,emailRequired,
        "SELECT position_id FROM positions WHERE position_name = '사원'",
        "INSERT INTO positions (position_name) VALUES ('Fixture') RETURNING position_id");
    long teamId = referenceId(connection,emailRequired,
        "SELECT team_id FROM teams WHERE team_name = '개발팀'",
        "INSERT INTO teams (team_name) VALUES ('Fixture') RETURNING team_id");
    String users = emailRequired
        ? "INSERT INTO users (user_id, position_id, team_id, employee_number, email, name, status) VALUES "
            + "(1001, %1$d, %2$d, 'fixture-1', 'fixture-1@example.test', 'Fixture One', 'ACTIVE'), "
            + "(1002, %1$d, %2$d, 'fixture-2', 'fixture-2@example.test', 'Fixture Two', 'ACTIVE')"
        : "INSERT INTO users (user_id, position_id, team_id, employee_number, name) VALUES "
            + "(1001, %1$d, %2$d, 'fixture-1', 'Fixture One'), "
            + "(1002, %1$d, %2$d, 'fixture-2', 'Fixture Two')";
    connection.createStatement().execute(users.formatted(positionId,teamId));
  }

  private static long referenceId(Connection connection,boolean seedDataAvailable,String selectSql,
      String insertSql) throws SQLException {
    try (var result = connection.createStatement()
        .executeQuery(seedDataAvailable ? selectSql : insertSql)) {
      assertThat(result.next()).isTrue();
      return result.getLong(1);
    }
  }

  private static String jdbcUrlFor(String schema) throws SQLException {
    try (Connection connection = DriverManager.getConnection(POSTGRES.getJdbcUrl(),
        POSTGRES.getUsername(),POSTGRES.getPassword())) {
      connection.createStatement().execute("CREATE SCHEMA " + schema);
    }
    return POSTGRES.getJdbcUrl() + "&currentSchema=" + schema;
  }
}
