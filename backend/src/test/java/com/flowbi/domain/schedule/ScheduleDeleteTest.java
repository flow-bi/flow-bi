package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class ScheduleDeleteTest {

  @Test
  void cancelsGeneralSchedulesAndPreservesTheirHistory() {
    Instant start = Instant.parse("2026-08-10T09:00:00Z");
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(
        List.of(ScheduleFixtures.personal(1L,10L,start,start.plusSeconds(3600))));
    ScheduleDeleteService service = new ScheduleDeleteService(repository, () -> Optional.of(10L),
        ScheduleChangeAuditLogger.noop());

    service.delete(1L);

    Schedule cancelled = repository.findByIdIncludingCancelled(1L).orElseThrow();
    assertThat(cancelled.isCancelled()).isTrue();
    assertThat(cancelled.getStatus()).isEqualTo(ScheduleStatus.CANCELED);
    assertThat(cancelled.getCancelledAt()).isNotNull();
    assertThat(cancelled.getCancelledBy()).isEqualTo(10L);
    assertThat(cancelled.getDetail().description()).isEqualTo("Planning");
    assertThat(cancelled.getAttendees()).isEmpty();
    assertThat(repository.findActiveOverlapping(start,start.plusSeconds(3600))).isEmpty();
    assertThat(repository.findById(1L)).isEmpty();
    ScheduleQueryService queryService = new ScheduleQueryService(repository, () -> Optional.of(10L),
        ScheduleMembershipReader.none());
    assertThat(queryService.getSchedules(start,start.plusSeconds(3600))).isEmpty();
    assertThatThrownBy(() -> queryService.getSchedule(1L))
        .isInstanceOf(ScheduleNotFoundException.class);
  }

  @Test
  void repeatDeletionByTheOwnerIsIdempotentAndAuditedWithoutScheduleDetails() {
    Instant start = Instant.parse("2026-08-10T09:00:00Z");
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(
        List.of(ScheduleFixtures.personal(1L,10L,start,start.plusSeconds(3600))));
    AtomicInteger events = new AtomicInteger();
    ScheduleDeleteService service = new ScheduleDeleteService(repository, () -> Optional.of(10L),
        (actorId,occurredAt,targetIds,successful) -> {
          assertThat(actorId).isEqualTo(10L);
          assertThat(targetIds).containsExactly(1L);
          assertThat(successful).isTrue();
          events.incrementAndGet();
        });

    service.delete(1L);
    Instant cancelledAt = repository.findByIdIncludingCancelled(1L).orElseThrow().getCancelledAt();
    service.delete(1L);

    assertThat(repository.findByIdIncludingCancelled(1L).orElseThrow().getCancelledAt())
        .isEqualTo(cancelledAt);
    assertThat(events).hasValue(2);
  }

  @Test
  void protectsRoomReservationLinkedSchedulesFromCalendarDeletion() {
    Instant start = Instant.parse("2026-08-10T09:00:00Z");
    Schedule roomLinked = ScheduleFixtures.roomReservationLinkedPersonal(1L,10L,start,
        start.plusSeconds(3600));
    ScheduleDeleteService service = new ScheduleDeleteService(
        new InMemoryScheduleRepository(List.of(roomLinked)), () -> Optional.of(10L),
        ScheduleChangeAuditLogger.noop());

    assertThatThrownBy(() -> service.delete(1L))
        .isInstanceOf(ScheduleRoomReservationManagedException.class);
  }
}
