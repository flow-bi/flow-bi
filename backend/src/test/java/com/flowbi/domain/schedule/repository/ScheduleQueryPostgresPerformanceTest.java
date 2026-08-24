package com.flowbi.domain.schedule.repository;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.service.*;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.schedule.port.ScheduleAudienceLookup;
import com.flowbi.domain.schedule.port.ScheduleReferenceValidator;
import com.flowbi.domain.schedule.port.ScheduleAuditWriter;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {"spring.datasource.driver-class-name=org.postgresql.Driver",
    "spring.jpa.hibernate.ddl-auto=none", "spring.flyway.enabled=true",
    "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
    "spring.jpa.show-sql=false"})
@Import(ScheduleQueryPostgresPerformanceTest.CalendarPortConfiguration.class)
class ScheduleQueryPostgresPerformanceTest {

  private static final long FIXTURE_USER_ID = 9_900_001L;
  private static final OffsetDateTime FROM = OffsetDateTime.parse("2026-08-01T00:00:00+09:00");
  private static final OffsetDateTime TO = OffsetDateTime.parse("2026-09-01T00:00:00+09:00");

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private ScheduleQueryService scheduleQueryService;

  @Autowired
  private ScheduleRepository scheduleRepository;

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url",POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username",POSTGRES::getUsername);
    registry.add("spring.datasource.password",POSTGRES::getPassword);
  }

  @BeforeEach
  void prepareFixture() {
    Long teamId = jdbcTemplate.queryForObject("SELECT team_id FROM teams WHERE team_name = '개발팀'",
        Long.class);
    Long positionId = jdbcTemplate
        .queryForObject("SELECT position_id FROM positions WHERE position_name = '사원'",Long.class);
    jdbcTemplate.update("""
        INSERT INTO users (user_id, position_id, team_id, employee_number, email, name, status)
        VALUES (?, ?, ?, 'performance-fixture', 'performance-fixture@example.test',
          'Performance Fixture', 'ACTIVE')
        """,FIXTURE_USER_ID,positionId,teamId);
    jdbcTemplate.batchUpdate("""
        INSERT INTO schedules (title, schedule_type, visibility, start_at, end_at, creator_id,
        is_all_day, color_label, creator_attends)
        VALUES (?, 'TEAM', 'TEAM', ?, ?, ?, false, 'BLUE', false)
        """,scheduleRows());
    jdbcTemplate.batchUpdate("""
        INSERT INTO schedule_targets (schedule_id, team_id, target_type)
        VALUES (?, ?, 'TEAM')
        """,targetRows(teamId));
    jdbcTemplate.batchUpdate("""
        INSERT INTO schedules_details (schedule_id, content, location)
        VALUES (?, NULL, NULL)
        """,targetRows());
    assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM schedules",Integer.class))
        .isEqualTo(1_000);
    assertThat(jdbcTemplate.queryForObject("""
        SELECT COUNT(*) FROM schedules
        WHERE status = 'ACTIVE' AND start_at < ? AND end_at > ?
        """,Integer.class,TO,FROM)).isEqualTo(1_000);
    assertThat(scheduleRepository.findActiveOverlappingWithAssociations(FROM,TO)).hasSize(1_000);
  }

  @Test
  void servesOneThousandAccessibleSchedulesWithinTheThreeSecondP95Budget() {
    ScheduleQuery query = ScheduleQuery.of(7L,FROM,TO);
    scheduleQueryService.query(query);
    scheduleQueryService.query(query);

    List<Long> elapsedMillis = new ArrayList<>();
    for (int run = 0; run < 20; run++) {
      long startedAt = System.nanoTime();
      assertThat(scheduleQueryService.query(query)).hasSize(1_000);
      elapsedMillis.add((System.nanoTime() - startedAt) / 1_000_000);
    }

    elapsedMillis.sort(Long::compareTo);
    long p95 = elapsedMillis.get(18);
    System.out
        .println("schedule-query-postgres-1000 warm-runs-ms=" + elapsedMillis + ", p95=" + p95);
    assertThat(p95).isLessThanOrEqualTo(3_000L);
  }

  private BatchPreparedStatementSetter scheduleRows() {
    return rows((statement,index) -> {
      statement.setString(1,"Schedule " + index);
      statement.setObject(2,FROM.plusMinutes(index));
      statement.setObject(3,FROM.plusMinutes(index + 30));
      statement.setLong(4,FIXTURE_USER_ID);
    });
  }

  private BatchPreparedStatementSetter targetRows(long teamId) {
    return rows((statement,index) -> {
      statement.setLong(1,index);
      statement.setLong(2,teamId);
    });
  }

  private BatchPreparedStatementSetter targetRows() {
    return rows((statement,index) -> statement.setLong(1,index));
  }

  private BatchPreparedStatementSetter rows(RowSetter rowSetter) {
    return new BatchPreparedStatementSetter() {
      @Override
      public void setValues(PreparedStatement statement,int index) throws SQLException {
        rowSetter.set(statement,index + 1);
      }

      @Override
      public int getBatchSize() {
        return 1_000;
      }
    };
  }

  @FunctionalInterface
  private interface RowSetter {

    void set(PreparedStatement statement,int index) throws SQLException;
  }

  @TestConfiguration
  static class CalendarPortConfiguration {

    @Bean
    @Primary
    ScheduleAudienceLookup scheduleAudienceLookup() {
      return new ScheduleAudienceLookup() {
        @Override
        public Set<Long> memberTeamIds(long actorId,Set<Long> teamIds) {
          return teamIds;
        }

        @Override
        public Set<Long> memberProjectIds(long actorId,Set<Long> projectIds) {
          return projectIds;
        }
      };
    }

    @Bean
    @Primary
    ScheduleReferenceValidator scheduleReferenceValidator() {
      return command -> {
      };
    }

    @Bean
    @Primary
    ScheduleRoomReservationLookup scheduleRoomReservationLookup() {
      return scheduleId -> false;
    }

    @Bean
    @Primary
    ScheduleAuditWriter scheduleAuditWriter() {
      return event -> {
      };
    }
  }
}
