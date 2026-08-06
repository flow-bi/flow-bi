package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.schedule.port.ScheduleReferenceValidator;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ScheduleUpdateServiceTest {

  @Test
  void letsOnlyTheCreatorReplaceTheValidatedGeneralScheduleFields() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleReferenceValidator validator = mock(ScheduleReferenceValidator.class);
    ScheduleRoomReservationLookup reservations = mock(ScheduleRoomReservationLookup.class);
    Schedule schedule = activeSchedule(1L);
    when(repository.findByIdWithAssociationsForUpdate(100L)).thenReturn(Optional.of(schedule));
    ScheduleUpdateService service = new ScheduleUpdateService(validator,
        new ScheduleUpdateTransaction(repository, reservations));
    ScheduleUpdateCommand command = updateCommand();

    Schedule updated = service.update(1L,100L,command);

    verify(validator).validateForUpdate(1L,command);
    assertThat(updated.getTitle()).isEqualTo("Updated planning");
    assertThat(updated.getType()).isEqualTo(ScheduleType.PROJECT);
    assertThat(updated.getDetail().getContent()).isEqualTo("Updated scope");
    assertThat(updated.getParticipants()).extracting(ScheduleParticipant::getUserId)
        .containsExactly(3L);
    assertThat(updated.getTargets())
        .filteredOn(target -> target.getType() == ScheduleTargetType.PROJECT)
        .extracting(ScheduleTarget::getProjectId).containsExactly(20L);
  }

  @Test
  void rejectsANonCreatorAndCanceledOrRoomReservationManagedSchedulesWithoutChangingThem() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleReferenceValidator validator = mock(ScheduleReferenceValidator.class);
    ScheduleRoomReservationLookup reservations = mock(ScheduleRoomReservationLookup.class);
    Schedule schedule = activeSchedule(1L);
    when(repository.findByIdWithAssociationsForUpdate(100L)).thenReturn(Optional.of(schedule));
    ScheduleUpdateService service = new ScheduleUpdateService(validator,
        new ScheduleUpdateTransaction(repository, reservations));

    assertThatThrownBy(() -> service.update(2L,100L,updateCommand()))
        .isInstanceOf(ScheduleNotFoundException.class);
    assertThat(schedule.getTitle()).isEqualTo("Planning");

    schedule.cancel(1L,OffsetDateTime.parse("2026-08-10T08:00:00+09:00"));
    assertThatThrownBy(() -> service.update(1L,100L,updateCommand()))
        .isInstanceOf(ScheduleNotFoundException.class);

    Schedule managed = activeSchedule(1L);
    when(repository.findByIdWithAssociationsForUpdate(101L)).thenReturn(Optional.of(managed));
    when(reservations.isManagedSchedule(101L)).thenReturn(true);
    assertThatThrownBy(() -> service.update(1L,101L,updateCommand()))
        .isInstanceOf(RoomReservationManagedScheduleException.class);
    assertThat(managed.getTitle()).isEqualTo("Planning");
  }

  @Test
  void rejectsInvalidUpdateValuesBeforeItCanReachPersistence() {
    assertThatThrownBy(() -> ScheduleUpdateCommand.of("Bad",ScheduleType.TEAM,
        ScheduleVisibility.TEAM,OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),false,ScheduleColorLabel.BLUE,null,null,
        false,List.of(2L,2L),List.of(),List.of(10L),List.of()))
        .isInstanceOf(InvalidScheduleUpdateCommandException.class);
    assertThatThrownBy(() -> ScheduleUpdateCommand.of("Bad",ScheduleType.PERSONAL,
        ScheduleVisibility.PRIVATE,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,null,null,
        false,List.of(),List.of(),List.of(10L),List.of()))
        .isInstanceOf(InvalidScheduleUpdateCommandException.class);
  }

  private Schedule activeSchedule(long creatorId) {
    return Schedule.create(ScheduleCreateCommand.of(creatorId,"Planning",ScheduleType.TEAM,
        ScheduleVisibility.TEAM,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,"Scope",
        "Room A",true,List.of(2L),List.of(),List.of(10L),List.of()));
  }

  private ScheduleUpdateCommand updateCommand() {
    return ScheduleUpdateCommand.of("Updated planning",ScheduleType.PROJECT,
        ScheduleVisibility.PROJECT,OffsetDateTime.parse("2026-08-11T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-11T10:00:00+09:00"),false,ScheduleColorLabel.GREEN,
        "Updated scope","Room B",false,List.of(3L),List.of(4L),List.of(),List.of(20L));
  }
}
