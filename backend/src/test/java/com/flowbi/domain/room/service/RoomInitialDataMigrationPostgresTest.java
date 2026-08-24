package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
class RoomInitialDataMigrationPostgresTest {

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @Test
  void insertsInitialRoomsExactlyOnce() throws SQLException {
    String jdbcUrl = jdbcUrlFor("room_initial_data");
    Flyway flyway = migrate(jdbcUrl);

    flyway.migrate();

    try (Connection connection = connection(jdbcUrl)) {
      assertThat(rooms(connection)).containsExactly(new Room(1L, "한강 회의실", 8L, "3층"),
          new Room(2L, "남산 회의실", 4L, "2층"),new Room(3L, "북한산 회의실", 12L, "4층"));
    }

    MigrateResult repeatedMigration = flyway.migrate();

    assertThat(repeatedMigration.migrationsExecuted).isZero();
    try (Connection connection = connection(jdbcUrl)) {
      assertThat(rooms(connection)).hasSize(3);
    }
  }

  private static List<Room> rooms(Connection connection) throws SQLException {
    try (ResultSet result = connection.createStatement().executeQuery(
        "SELECT room_id, room_name, capacity, location FROM rooms ORDER BY room_id")) {
      List<Room> rooms = new ArrayList<>();
      while (result.next()) {
        rooms.add(new Room(result.getLong("room_id"), result.getString("room_name"),
            result.getLong("capacity"), result.getString("location")));
      }
      return rooms;
    }
  }

  private static Connection connection(String jdbcUrl) throws SQLException {
    return DriverManager.getConnection(jdbcUrl,POSTGRES.getUsername(),POSTGRES.getPassword());
  }

  private static Flyway migrate(String jdbcUrl) {
    return Flyway.configure().dataSource(jdbcUrl,POSTGRES.getUsername(),POSTGRES.getPassword())
        .load();
  }

  private static String jdbcUrlFor(String schema) throws SQLException {
    try (Connection connection = connection(POSTGRES.getJdbcUrl())) {
      connection.createStatement().execute("CREATE SCHEMA " + schema);
    }
    return POSTGRES.getJdbcUrl() + "&currentSchema=" + schema;
  }

  private record Room(long id, String name, long capacity, String location) {
  }
}
