package com.flowbi.domain.room.service;

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
class RoomReservationCancellationMigrationPostgresTest {

  private static final String PRE_CANCELLATION_VERSION = "20260819030558.00";

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @Test
  void preservesReservationsAndAddsCancellationAuditIntegrity() throws SQLException {
    String jdbcUrl = jdbcUrlFor("room_cancellation_audit");
    migrate(jdbcUrl).target(PRE_CANCELLATION_VERSION).load().migrate();

    try (Connection connection = connection(jdbcUrl)) {
      insertReservationReferences(connection);
      connection.createStatement().execute(
          "INSERT INTO rooms_reservations (reservation_id, room_id, schedule_id, title, start_at, end_at, status) VALUES "
              + "(1, 1, 1, 'reserved', '2026-08-10 10:00:00', '2026-08-10 11:00:00', 'RESERVED'), "
              + "(2, 1, 2, 'canceled', '2026-08-10 11:00:00', '2026-08-10 12:00:00', 'CANCELED')");
    }

    migrate(jdbcUrl).load().migrate();

    try (Connection connection = connection(jdbcUrl)) {
      var reservations = connection.createStatement().executeQuery(
          "SELECT reservation_id, status, cancelled_at FROM rooms_reservations ORDER BY reservation_id");
      assertThat(reservations.next()).isTrue();
      assertThat(reservations.getLong("reservation_id")).isEqualTo(1L);
      assertThat(reservations.getString("status")).isEqualTo("RESERVED");
      assertThat(reservations.getTimestamp("cancelled_at")).isNull();
      assertThat(reservations.next()).isTrue();
      assertThat(reservations.getLong("reservation_id")).isEqualTo(2L);
      assertThat(reservations.getString("status")).isEqualTo("CANCELED");
      assertThat(reservations.getTimestamp("cancelled_at")).isNotNull();
      assertThat(reservations.next()).isFalse();

      assertThatThrownBy(() -> connection.createStatement().execute(
          "UPDATE rooms_reservations SET cancelled_at = CURRENT_TIMESTAMP WHERE reservation_id = 1"))
          .isInstanceOf(SQLException.class);
      assertThatThrownBy(() -> connection.createStatement()
          .execute("UPDATE rooms_reservations SET cancelled_at = NULL WHERE reservation_id = 2"))
          .isInstanceOf(SQLException.class);

      assertThat(count(connection,
          "SELECT count(*) FROM pg_constraint WHERE conname IN "
              + "('fk_room_reservations_room', 'fk_room_reservations_schedule', "
              + "'ck_room_reservations_cancellation_audit')"))
          .isEqualTo(3L);
      assertThat(count(connection,
          "SELECT count(*) FROM pg_indexes WHERE tablename = 'rooms_reservations' AND indexname IN "
              + "('idx_room_reservations_active_period', 'idx_room_reservations_schedule')"))
          .isEqualTo(2L);
    }
  }

  private static void insertReservationReferences(Connection connection) throws SQLException {
    long positionId = id(connection,"SELECT position_id FROM positions WHERE position_name = '사원'");
    long teamId = id(connection,"SELECT team_id FROM teams WHERE team_name = '개발팀'");
    String insertUser = ("INSERT INTO users "
        + "(user_id, position_id, team_id, employee_number, email, name, status) "
        + "VALUES (1, %d, %d, 'room-migration', 'room-migration@example.test', "
        + "'Room Migration', 'ACTIVE')").formatted(positionId,teamId);
    connection.createStatement().execute(insertUser);
    connection.createStatement().execute(
        "INSERT INTO schedules (schedule_id, title, schedule_type, visibility, start_at, end_at, creator_id) VALUES "
            + "(1, 'reserved', 'PERSONAL', 'PRIVATE', '2026-08-10T01:00:00Z', "
            + "'2026-08-10T02:00:00Z', 1), "
            + "(2, 'canceled', 'PERSONAL', 'PRIVATE', '2026-08-10T02:00:00Z', "
            + "'2026-08-10T03:00:00Z', 1)");
    connection.createStatement()
        .execute("INSERT INTO rooms (room_id, room_name) VALUES (1, 'Orchid')");
  }

  private static long id(Connection connection,String sql) throws SQLException {
    try (var result = connection.createStatement().executeQuery(sql)) {
      assertThat(result.next()).isTrue();
      return result.getLong(1);
    }
  }

  private static long count(Connection connection,String sql) throws SQLException {
    try (var result = connection.createStatement().executeQuery(sql)) {
      assertThat(result.next()).isTrue();
      return result.getLong(1);
    }
  }

  private static Connection connection(String jdbcUrl) throws SQLException {
    return DriverManager.getConnection(jdbcUrl,POSTGRES.getUsername(),POSTGRES.getPassword());
  }

  private static FluentConfiguration migrate(String jdbcUrl) {
    return Flyway.configure().dataSource(jdbcUrl,POSTGRES.getUsername(),POSTGRES.getPassword());
  }

  private static String jdbcUrlFor(String schema) throws SQLException {
    try (Connection connection = connection(POSTGRES.getJdbcUrl())) {
      connection.createStatement().execute("CREATE SCHEMA " + schema);
    }
    return POSTGRES.getJdbcUrl() + "&currentSchema=" + schema;
  }
}
