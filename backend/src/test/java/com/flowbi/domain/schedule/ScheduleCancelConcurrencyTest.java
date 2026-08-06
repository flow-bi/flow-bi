package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.flowbi.domain.schedule.port.ScheduleAuditWriter;
import com.flowbi.domain.schedule.port.ScheduleAudienceLookup;
import com.flowbi.domain.schedule.port.ScheduleReferenceValidator;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@Import(ScheduleCancelConcurrencyTest.CalendarBoundaryConfiguration.class)
class ScheduleCancelConcurrencyTest {

  @Autowired
  private ScheduleCreateService createService;

  @Autowired
  private ScheduleUpdateService updateService;

  @Autowired
  private ScheduleCancelService cancelService;

  @Autowired
  private ScheduleRepository scheduleRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Test
  void serializesConcurrentUpdateAndCancelWithoutPartialAggregateChanges() throws Exception {
    jdbcTemplate.update("INSERT INTO users (user_id) VALUES (701), (702), (703)");
    jdbcTemplate.update("INSERT INTO teams (team_id) VALUES (710)");
    Schedule created = createService.create(command("Initial",List.of(702L)));
    CyclicBarrier barrier = new CyclicBarrier(2);
    String updateResult;

    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      Future<String> update = executor.submit(afterBarrier(barrier,() -> {
        try {
          updateService.update(701L,created.getId(),updateCommand());
          return "updated";
        } catch (ScheduleNotFoundException exception) {
          return "not-found";
        }
      }));
      Future<String> cancel = executor.submit(afterBarrier(barrier,() -> {
        cancelService.cancel(701L,created.getId());
        return "cancelled";
      }));

      updateResult = update.get();
      assertThat(updateResult).isIn("updated","not-found");
      assertThat(cancel.get()).isEqualTo("cancelled");
    } finally {
      executor.shutdownNow();
    }

    assertThat(value("SELECT status FROM schedules WHERE schedule_id = ?",created.getId()))
        .isEqualTo("CANCELED");
    assertThat(value("SELECT cancelled_by FROM schedules WHERE schedule_id = ?",created.getId()))
        .isEqualTo(701L);
    if (updateResult.equals("updated")) {
      assertThat(
          value("SELECT COUNT(*) FROM schedule_participants WHERE schedule_id = ?",created.getId()))
          .isEqualTo(2L);
      assertThat(
          value("SELECT content FROM schedules_details WHERE schedule_id = ?",created.getId()))
          .isEqualTo("Updated detail");
    } else {
      assertThat(
          value("SELECT COUNT(*) FROM schedule_participants WHERE schedule_id = ?",created.getId()))
          .isEqualTo(1L);
      assertThat(
          value("SELECT content FROM schedules_details WHERE schedule_id = ?",created.getId()))
          .isEqualTo("Initial detail");
    }
    assertThat(value("SELECT COUNT(*) FROM schedule_targets WHERE schedule_id = ?",created.getId()))
        .isEqualTo(1L);
  }

  @Test
  void rollsBackTheEntireUpdateWhenANewParticipantViolatesTheDatabaseConstraint() {
    jdbcTemplate.update("INSERT INTO users (user_id) VALUES (801), (802)");
    jdbcTemplate.update("INSERT INTO teams (team_id) VALUES (810)");
    Schedule created = createService.create(ScheduleCreateCommand.of(801L,"Rollback",
        ScheduleType.TEAM,ScheduleVisibility.TEAM,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,
        "Original detail","Room A",false,List.of(802L),List.of(),List.of(810L),List.of()));
    ScheduleUpdateCommand invalidReference = ScheduleUpdateCommand.of("Changed",ScheduleType.TEAM,
        ScheduleVisibility.TEAM,OffsetDateTime.parse("2026-08-10T11:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T12:00:00+09:00"),false,ScheduleColorLabel.GREEN,
        "Changed detail","Room B",true,List.of(999L),List.of(),List.of(810L),List.of());

    assertThatThrownBy(() -> updateService.update(801L,created.getId(),invalidReference))
        .isInstanceOf(RuntimeException.class);

    assertThat(value("SELECT title FROM schedules WHERE schedule_id = ?",created.getId()))
        .isEqualTo("Rollback");
    assertThat(value("SELECT content FROM schedules_details WHERE schedule_id = ?",created.getId()))
        .isEqualTo("Original detail");
    assertThat(
        value("SELECT COUNT(*) FROM schedule_participants WHERE schedule_id = ?",created.getId()))
        .isEqualTo(1L);
  }

  private Object value(String sql,long scheduleId) {
    return jdbcTemplate.queryForObject(sql,Object.class,scheduleId);
  }

  private Callable<String> afterBarrier(CyclicBarrier barrier,Callable<String> action) {
    return () -> {
      barrier.await();
      return action.call();
    };
  }

  private ScheduleCreateCommand command(String title,List<Long> participants) {
    return ScheduleCreateCommand.of(701L,title,ScheduleType.TEAM,ScheduleVisibility.TEAM,
        OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,
        "Initial detail","Room A",true,participants,List.of(),List.of(710L),List.of());
  }

  private ScheduleUpdateCommand updateCommand() {
    return ScheduleUpdateCommand.of("Updated",ScheduleType.TEAM,ScheduleVisibility.TEAM,
        OffsetDateTime.parse("2026-08-10T11:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T12:00:00+09:00"),false,ScheduleColorLabel.GREEN,
        "Updated detail","Room B",false,List.of(702L,703L),List.of(),List.of(710L),List.of());
  }

  @TestConfiguration
  static class CalendarBoundaryConfiguration {

    @Bean
    ScheduleReferenceValidator scheduleReferenceValidator() {
      return command -> {
      };
    }

    @Bean
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
    ScheduleRoomReservationLookup scheduleRoomReservationLookup() {
      return scheduleId -> false;
    }

    @Bean
    ScheduleAuditWriter scheduleAuditWriter() {
      ConcurrentLinkedQueue<ScheduleAuditEvent> events = new ConcurrentLinkedQueue<>();
      return events::add;
    }
  }
}
