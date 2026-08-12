package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.flowbi.domain.schedule.port.ScheduleReferenceValidator;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import com.flowbi.domain.schedule.port.ScheduleAudienceLookup;
import com.flowbi.domain.schedule.port.ScheduleAuditWriter;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@Import(ScheduleCreateTransactionTest.ReferenceValidationConfiguration.class)
class ScheduleCreateTransactionTest {

  @Autowired
  private ScheduleCreateService scheduleCreateService;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Test
  void persistsTheScheduleDetailTargetsAndParticipantsAsOneAggregate() {
    jdbcTemplate
        .update("INSERT INTO positions (position_id, position_name) VALUES (100, 'Fixture')");
    jdbcTemplate.update("INSERT INTO teams (team_id, team_name) VALUES (10, 'Fixture')");
    jdbcTemplate
        .update("INSERT INTO users (user_id, position_id, team_id, employee_number, name) VALUES "
            + "(1, 100, 10, 'schedule-1', 'Schedule One'), "
            + "(2, 100, 10, 'schedule-2', 'Schedule Two'), "
            + "(3, 100, 10, 'schedule-3', 'Schedule Three')");

    Schedule schedule = scheduleCreateService.create(ScheduleCreateCommand.of(1L,"Planning",
        ScheduleType.TEAM,ScheduleVisibility.TEAM,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,"Scope",
        "Room A",true,List.of(2L,3L),List.of(),List.of(10L),List.of()));

    assertThat(schedule.getId()).isNotNull();
    assertThat(countByTitle("schedules","Planning")).isEqualTo(1);
    assertThat(countByTitle("schedules_details","Planning")).isEqualTo(1);
    assertThat(countByTitle("schedule_targets","Planning")).isEqualTo(1);
    assertThat(countByTitle("schedule_participants","Planning")).isEqualTo(2);
  }

  @Test
  void rollsBackTheEntireAggregateWhenAParticipantReferenceCannotBePersisted() {
    jdbcTemplate
        .update("INSERT INTO positions (position_id, position_name) VALUES (200, 'Fixture')");
    jdbcTemplate.update("INSERT INTO teams (team_id, team_name) VALUES (30, 'Fixture')");
    jdbcTemplate.update("INSERT INTO users (user_id, position_id, team_id, employee_number, name) "
        + "VALUES (20, 200, 30, 'schedule-20', 'Schedule Twenty')");

    assertThatThrownBy(() -> scheduleCreateService.create(ScheduleCreateCommand.of(20L,"Failing",
        ScheduleType.TEAM,ScheduleVisibility.TEAM,OffsetDateTime.parse("2026-08-11T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-11T10:00:00+09:00"),false,ScheduleColorLabel.RED,null,null,
        false,List.of(999L),List.of(),List.of(30L),List.of())))
        .isInstanceOf(RuntimeException.class);

    assertThat(countByTitle("schedules","Failing")).isZero();
    assertThat(countByTitle("schedules_details","Failing")).isZero();
    assertThat(countByTitle("schedule_targets","Failing")).isZero();
    assertThat(countByTitle("schedule_participants","Failing")).isZero();
  }

  private int countByTitle(String tableName,String title) {
    String scheduleIdQuery = "SELECT schedule_id FROM schedules WHERE title = ?";
    if (tableName.equals("schedules")) {
      return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM schedules WHERE title = ?",
          Integer.class,title);
    }
    return jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM " + tableName + " WHERE schedule_id IN (" + scheduleIdQuery + ")",
        Integer.class,title);
  }

  @TestConfiguration
  static class ReferenceValidationConfiguration {

    @Bean
    @Primary
    ScheduleReferenceValidator scheduleReferenceValidator() {
      return command -> {
      };
    }

    @Bean
    @Primary
    ScheduleAudienceLookup scheduleAudienceLookup() {
      return new ScheduleAudienceLookup() {
        @Override
        public Set<Long> memberTeamIds(long actorId,Set<Long> teamIds) {
          return Set.of();
        }

        @Override
        public Set<Long> memberProjectIds(long actorId,Set<Long> projectIds) {
          return Set.of();
        }
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
