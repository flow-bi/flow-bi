package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.CreateRoomReservationCommand;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.service.ScheduleCreationService;
import com.flowbi.domain.schedule.service.ScheduleCreationService.CreatedSchedule;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RoomReservationServiceTest {

  private static final ReservationActor ACTOR = new ReservationActor(10L);
  private static final LocalDateTime START = LocalDateTime.of(2026,8,10,10,0);
  private static final LocalDateTime END = LocalDateTime.of(2026,8,10,11,0);

  @Mock
  private RoomRepository roomRepository;
  @Mock
  private RoomReservationRepository reservationRepository;
  @Mock
  private ReservationParticipantAccessService participantAccessService;
  @Mock
  private ScheduleCreationService scheduleCreationService;

  @Test
  void createsReservedRoomReservationAndAnActiveSchedule() {
    RoomReservationService service = service();
    when(roomRepository.findByIdForUpdate(1L))
        .thenReturn(Optional.of(Room.of(1L,"Orchid",4L,"3F")));
    when(reservationRepository.existsReservedOverlap(1L,START,END)).thenReturn(false);
    when(participantAccessService.canAttend(ACTOR,10L)).thenReturn(true);
    when(participantAccessService.canAttend(ACTOR,11L)).thenReturn(true);
    when(scheduleCreationService.create(any())).thenReturn(new CreatedSchedule(31L));
    when(reservationRepository.save(any())).thenAnswer(invocation -> RoomReservation.of(21L,
        invocation.getArgument(0,RoomReservation.class).getRoom(),31L,"Planning",START,END,
        com.flowbi.domain.room.entity.ReservationStatus.RESERVED));

    var result = service.create(ACTOR,command(List.of(10L,11L)));

    assertThat(result.reservationId()).isEqualTo(21L);
    assertThat(result.scheduleId()).isEqualTo(31L);
    ArgumentCaptor<com.flowbi.domain.schedule.service.CreateScheduleCommand> schedule = ArgumentCaptor
        .forClass(com.flowbi.domain.schedule.service.CreateScheduleCommand.class);
    verify(scheduleCreationService).create(schedule.capture());
    assertThat(schedule.getValue().creatorId()).isEqualTo(10L);
    assertThat(schedule.getValue().location()).isEqualTo("Orchid");
    assertThat(schedule.getValue().attendeeIds()).containsExactly(10L,11L);
    assertThat(schedule.getValue().status())
        .isEqualTo(com.flowbi.domain.schedule.entity.ScheduleStatus.ACTIVE);
  }

  @Test
  void rejectsMissingActorAndInvalidTimeBeforeWriting() {
    RoomReservationService service = service();

    assertThatThrownBy(() -> service.create(null,command(List.of(10L))))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("RESERVATION_ACTOR_REQUIRED");
    assertThatThrownBy(() -> service.create(ACTOR,
        new CreateRoomReservationCommand(1L, "Planning", END, START, List.of(10L),
            "Discuss roadmap")))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_INVALID");
  }

  @Test
  void rejectsReservationsOutsideBusinessHoursBeforeWriting() {
    RoomReservationService service = service();

    assertThatThrownBy(() -> service.create(ACTOR,
        new CreateRoomReservationCommand(1L, "Planning", START.withHour(8), START, List.of(10L),
            "Discuss roadmap")))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_INVALID");
    assertThatThrownBy(() -> service.create(ACTOR,
        new CreateRoomReservationCommand(1L, "Planning", END, END.withHour(19), List.of(10L),
            "Discuss roadmap")))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_INVALID");
  }

  @Test
  void rejectsUnavailableParticipantsAndCapacityOverflow() {
    RoomReservationService service = service();
    when(roomRepository.findByIdForUpdate(1L))
        .thenReturn(Optional.of(Room.of(1L,"Orchid",1L,"3F")));
    when(participantAccessService.canAttend(ACTOR,10L)).thenReturn(true);
    when(participantAccessService.canAttend(ACTOR,11L)).thenReturn(false);

    assertThatThrownBy(() -> service.create(ACTOR,command(List.of(10L,11L))))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("RESERVATION_PARTICIPANT_FORBIDDEN");

    when(participantAccessService.canAttend(ACTOR,11L)).thenReturn(true);
    assertThatThrownBy(() -> service.create(ACTOR,command(List.of(10L,11L))))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_CAPACITY_EXCEEDED");
  }

  @Test
  void rejectsSamePartialAndContainingOverlapsWithOneConflictCode() {
    RoomReservationService service = service();
    when(roomRepository.findByIdForUpdate(1L))
        .thenReturn(Optional.of(Room.of(1L,"Orchid",4L,"3F")));
    when(participantAccessService.canAttend(ACTOR,10L)).thenReturn(true);
    when(reservationRepository.existsReservedOverlap(1L,START,END)).thenReturn(true);

    assertThatThrownBy(() -> service.create(ACTOR,command(List.of(10L))))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_CONFLICT");
  }

  @Test
  void acceptsBusinessHourBoundariesAndPreservesFirstAttendeeOccurrence() {
    RoomReservationService service = service();
    LocalDateTime businessStart = LocalDateTime.of(2026,8,10,9,0);
    LocalDateTime businessEnd = LocalDateTime.of(2026,8,10,18,0);
    when(roomRepository.findByIdForUpdate(1L))
        .thenReturn(Optional.of(Room.of(1L,"Orchid",2L,"3F")));
    when(reservationRepository.existsReservedOverlap(1L,businessStart,businessEnd))
        .thenReturn(false);
    when(participantAccessService.canAttend(ACTOR,11L)).thenReturn(true);
    when(participantAccessService.canAttend(ACTOR,10L)).thenReturn(true);
    when(scheduleCreationService.create(any())).thenReturn(new CreatedSchedule(31L));
    when(reservationRepository.save(any())).thenAnswer(invocation -> RoomReservation.of(21L,
        invocation.getArgument(0,RoomReservation.class).getRoom(),31L,"Planning",businessStart,
        businessEnd,com.flowbi.domain.room.entity.ReservationStatus.RESERVED));

    service.create(ACTOR,new CreateRoomReservationCommand(1L, "Planning", businessStart,
        businessEnd, List.of(11L,10L,11L), "Discuss roadmap"));

    ArgumentCaptor<com.flowbi.domain.schedule.service.CreateScheduleCommand> schedule = ArgumentCaptor
        .forClass(com.flowbi.domain.schedule.service.CreateScheduleCommand.class);
    verify(scheduleCreationService).create(schedule.capture());
    assertThat(schedule.getValue().attendeeIds()).containsExactly(11L,10L);
  }

  private RoomReservationService service() {
    return new RoomReservationService(roomRepository, reservationRepository,
        participantAccessService, scheduleCreationService);
  }

  private CreateRoomReservationCommand command(List<Long> attendees) {
    return new CreateRoomReservationCommand(1L, "Planning", START, END, attendees,
        "Discuss roadmap");
  }
}
