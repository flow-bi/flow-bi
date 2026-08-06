package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.schedule.port.ScheduleAuditWriter;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ScheduleCancelServiceTest {

  @Test
  void softCancelsOncePreservesRelationshipsAndMakesCreatorRetriesIdempotent() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleRoomReservationLookup reservations = mock(ScheduleRoomReservationLookup.class);
    ScheduleAuditWriter auditWriter = mock(ScheduleAuditWriter.class);
    Schedule schedule = activeSchedule();
    when(repository.findByIdWithAssociationsForUpdate(100L)).thenReturn(Optional.of(schedule));
    ScheduleCancelService service = service(repository,reservations,auditWriter);

    service.cancel(1L,100L);
    service.cancel(1L,100L);

    assertThat(schedule.getStatus()).isEqualTo(ScheduleStatus.CANCELED);
    assertThat(schedule.getCancelledBy()).isEqualTo(1L);
    assertThat(schedule.getCancelledAt()).isEqualTo(OffsetDateTime.parse("2026-08-10T00:00:00Z"));
    assertThat(schedule.getParticipants()).hasSize(1);
    assertThat(schedule.getTargets()).hasSize(1);
    verify(auditWriter).write(new ScheduleAuditEvent(1L,
        OffsetDateTime.parse("2026-08-10T00:00:00Z"), 100L, ScheduleAuditResult.CANCELED));
    verify(auditWriter).write(new ScheduleAuditEvent(1L,
        OffsetDateTime.parse("2026-08-10T00:00:00Z"), 100L, ScheduleAuditResult.ALREADY_CANCELED));
  }

  @Test
  void returnsTheSameSafeNotFoundForMissingAndNonCreatorSchedules() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleRoomReservationLookup reservations = mock(ScheduleRoomReservationLookup.class);
    ScheduleAuditWriter auditWriter = mock(ScheduleAuditWriter.class);
    when(repository.findByIdWithAssociationsForUpdate(100L))
        .thenReturn(Optional.of(activeSchedule()));
    when(repository.findByIdWithAssociationsForUpdate(101L)).thenReturn(Optional.empty());
    ScheduleCancelService service = service(repository,reservations,auditWriter);

    assertThatThrownBy(() -> service.cancel(2L,100L)).isInstanceOf(ScheduleNotFoundException.class);
    assertThatThrownBy(() -> service.cancel(1L,101L)).isInstanceOf(ScheduleNotFoundException.class);
    verify(auditWriter,org.mockito.Mockito.times(2)).write(any(ScheduleAuditEvent.class));
  }

  @Test
  void rejectsRoomReservationManagedSchedulesWithoutCancellingThem() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleRoomReservationLookup reservations = mock(ScheduleRoomReservationLookup.class);
    ScheduleAuditWriter auditWriter = mock(ScheduleAuditWriter.class);
    Schedule schedule = activeSchedule();
    when(repository.findByIdWithAssociationsForUpdate(100L)).thenReturn(Optional.of(schedule));
    when(reservations.isManagedSchedule(100L)).thenReturn(true);

    assertThatThrownBy(() -> service(repository,reservations,auditWriter).cancel(1L,100L))
        .isInstanceOf(RoomReservationManagedScheduleException.class);
    assertThat(schedule.getStatus()).isEqualTo(ScheduleStatus.ACTIVE);
  }

  private ScheduleCancelService service(ScheduleRepository repository,
      ScheduleRoomReservationLookup reservations,ScheduleAuditWriter auditWriter) {
    Clock clock = Clock.fixed(Instant.parse("2026-08-10T00:00:00Z"),ZoneOffset.UTC);
    return new ScheduleCancelService(auditWriter, clock,
        new ScheduleCancelTransaction(repository, reservations));
  }

  private Schedule activeSchedule() {
    return Schedule.create(ScheduleCreateCommand.of(1L,"Planning",ScheduleType.TEAM,
        ScheduleVisibility.TEAM,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,"Scope",
        "Room A",true,List.of(2L),List.of(),List.of(10L),List.of()));
  }
}
