package com.flowbi.domain.team.repository;

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
class TeamHierarchyMigrationPostgresTest {

  private static final String PRE_HIERARCHY_VERSION = "20260819030558.00";

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @Test
  void preservesExistingTeamsAndAddsHierarchyConstraintsAndClosureBackfill() throws SQLException {
    String jdbcUrl = jdbcUrlFor("team_hierarchy");
    migrate(jdbcUrl).target(PRE_HIERARCHY_VERSION).load().migrate();

    try (Connection connection = connect(jdbcUrl)) {
      connection.createStatement()
          .execute("INSERT INTO teams (team_id, team_name) VALUES (100, 'Legacy')");
    }
    migrate(jdbcUrl).load().migrate();

    try (Connection connection = connect(jdbcUrl)) {
      assertThat(
          queryLong(connection,"SELECT COUNT(*) FROM teams_closure WHERE ancestor_team_id = 100 "
              + "AND descendant_team_id = 100 AND depth = 0"))
          .isEqualTo(1);
      assertThatThrownBy(() -> connection.createStatement()
          .execute("INSERT INTO teams (team_name, parent_team_id) VALUES ('Legacy', NULL)"))
          .isInstanceOf(SQLException.class);
      connection.createStatement()
          .execute("INSERT INTO teams (team_id, team_name) VALUES (101, 'Parent')");
      connection.createStatement()
          .execute("INSERT INTO teams (team_name, parent_team_id) VALUES ('Child', 101)");
      assertThatThrownBy(() -> connection.createStatement()
          .execute("INSERT INTO teams (team_name, parent_team_id) VALUES (' child ', 101)"))
          .isInstanceOf(SQLException.class);
      assertThatThrownBy(() -> connection.createStatement()
          .execute("INSERT INTO teams (team_name, parent_team_id) VALUES ('Self', 999999)"))
          .isInstanceOf(SQLException.class);
      assertThatThrownBy(() -> connection.createStatement()
          .execute("UPDATE teams SET parent_team_id = team_id WHERE team_id = 100"))
          .isInstanceOf(SQLException.class);
      assertThatThrownBy(() -> connection.createStatement()
          .execute("INSERT INTO teams_closure (ancestor_team_id, descendant_team_id, depth) "
              + "VALUES (100, 100, 1)"))
          .isInstanceOf(SQLException.class);
      assertThatThrownBy(() -> connection.createStatement()
          .execute("INSERT INTO teams_closure (ancestor_team_id, descendant_team_id, depth) "
              + "VALUES (100, 101, -1)"))
          .isInstanceOf(SQLException.class);
      assertThatThrownBy(() -> connection.createStatement()
          .execute("INSERT INTO teams_closure (ancestor_team_id, descendant_team_id, depth) "
              + "VALUES (100, 999999, 1)"))
          .isInstanceOf(SQLException.class);
      assertThat(queryLong(connection,
          "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'teams_closure' "
              + "AND indexname IN ('idx_teams_closure_ancestor_depth_descendant', "
              + "'idx_teams_closure_descendant_depth_ancestor')"))
          .isEqualTo(2);
      assertThat(explainUsesIndex(connection,
          "SELECT * FROM teams_closure WHERE ancestor_team_id = 100 AND depth = 0")).isTrue();
      assertThat(explainUsesIndex(connection,
          "SELECT * FROM teams_closure WHERE descendant_team_id = 100 AND depth = 0")).isTrue();
    }
  }

  private static FluentConfiguration migrate(String jdbcUrl) {
    return Flyway.configure().dataSource(jdbcUrl,POSTGRES.getUsername(),POSTGRES.getPassword());
  }

  private static Connection connect(String jdbcUrl) throws SQLException {
    return DriverManager.getConnection(jdbcUrl,POSTGRES.getUsername(),POSTGRES.getPassword());
  }

  private static long queryLong(Connection connection,String sql) throws SQLException {
    try (var result = connection.createStatement().executeQuery(sql)) {
      assertThat(result.next()).isTrue();
      return result.getLong(1);
    }
  }

  private static boolean explainUsesIndex(Connection connection,String sql) throws SQLException {
    connection.createStatement().execute("SET enable_seqscan = off");
    try (var result = connection.createStatement().executeQuery("EXPLAIN " + sql)) {
      StringBuilder plan = new StringBuilder();
      while (result.next()) {
        plan.append(result.getString(1));
      }
      return plan.toString().contains("Index Scan") || plan.toString().contains("Index Only Scan");
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
