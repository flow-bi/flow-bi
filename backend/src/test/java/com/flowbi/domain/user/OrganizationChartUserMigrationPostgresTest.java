package com.flowbi.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
class OrganizationChartUserMigrationPostgresTest {

  private static final String BEFORE_WORK_STATUS_VERSION = "20260823081843.00";

  @Container
  static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

  @Test
  void backfillsExistingUsersAndRejectsInvalidWorkStatuses() throws SQLException {
    String jdbcUrl = schemaJdbcUrl("organization_chart_work_status");
    Flyway.configure().dataSource(jdbcUrl,postgres.getUsername(),postgres.getPassword())
        .target(BEFORE_WORK_STATUS_VERSION).load().migrate();

    try (Connection connection = connection(jdbcUrl)) {
      long teamId = id(connection,
          "INSERT INTO teams (team_name) VALUES ('Fixture') RETURNING team_id");
      long positionId = id(connection,
          "INSERT INTO positions (position_name) VALUES ('Fixture') RETURNING position_id");
      connection.createStatement().execute("""
          INSERT INTO users (position_id, team_id, employee_number, email, name, status)
          VALUES (%d, %d, 'fixture-user', 'fixture@example.test', 'Fixture User', 'ACTIVE')
          """.formatted(positionId,teamId));
    }

    Flyway.configure().dataSource(jdbcUrl,postgres.getUsername(),postgres.getPassword()).load()
        .migrate();

    try (Connection connection = connection(jdbcUrl)) {
      var result = connection.createStatement()
          .executeQuery("SELECT work_status FROM users WHERE employee_number = 'fixture-user'");
      assertThat(result.next()).isTrue();
      assertThat(result.getString("work_status")).isEqualTo("OFFLINE");
      connection.createStatement().execute("""
          INSERT INTO users (position_id, team_id, employee_number, email, name, status)
          SELECT position_id, team_id, 'new-user', 'new@example.test', 'New User', 'ACTIVE'
          FROM users WHERE employee_number = 'fixture-user'
          """);
      var newUser = connection.createStatement()
          .executeQuery("SELECT work_status FROM users WHERE employee_number = 'new-user'");
      assertThat(newUser.next()).isTrue();
      assertThat(newUser.getString("work_status")).isEqualTo("OFFLINE");
      assertThatThrownBy(() -> connection.createStatement().execute(
          "UPDATE users SET work_status = 'INVALID' WHERE employee_number = 'fixture-user'"))
          .isInstanceOf(SQLException.class);
    }
  }

  private Connection connection(String jdbcUrl) throws SQLException {
    return DriverManager.getConnection(jdbcUrl,postgres.getUsername(),postgres.getPassword());
  }

  private long id(Connection connection,String sql) throws SQLException {
    try (var result = connection.createStatement().executeQuery(sql)) {
      assertThat(result.next()).isTrue();
      return result.getLong(1);
    }
  }

  private String schemaJdbcUrl(String schema) throws SQLException {
    try (Connection connection = DriverManager.getConnection(postgres.getJdbcUrl(),
        postgres.getUsername(),postgres.getPassword())) {
      connection.createStatement().execute("CREATE SCHEMA " + schema);
    }
    return postgres.getJdbcUrl() + "&currentSchema=" + schema;
  }
}
