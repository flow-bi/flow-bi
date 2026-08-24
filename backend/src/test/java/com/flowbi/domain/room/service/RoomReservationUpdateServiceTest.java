package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.dto.UpdateRoomReservationCommand;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService.ReservationSchedule;
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
class RoomReservationUpdateServiceTest {

  private static final ReservationActor OWNER = new ReservationActor(10L);
  private static final LocalDateTime START = LocalDateTime.of(2026,8,10,11,0);
  private static final LocalDateTime END = LocalDateTime.of(2026,8,10,12,0);

  @Mock
  private RoomRepository roomRepository;
  @Mock
  private RoomReservationRepository reservationRepository;
  @Mock
  private ReservationParticipantAccessService participantAccessService;
  @Mock
  private ScheduleModificationService scheduleModificationService;

  @Test
  void updatesTheOwnedReservationAndItsScheduleWithNormalizedAttendees() {
    RoomReservationService service = service();
    Room oldRoom = Room.of(1L,"Orchid",4L,"3F");
    Room newRoom = Room.of(2L,"Iris",4L,"4F");
    RoomReservation reservation = RoomReservation.of(100L,oldRoom,200L,"Old title",
        START.minusHours(1),START,ReservationStatus.RESERVED);
    when(reservationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(reservation));
    when(scheduleModificationService.findReservationSchedule(200L))
        .thenReturn(Optional.of(new ReservationSchedule(200L, 10L)));
    when(roomRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(newRoom));
    when(reservationRepository.existsReservedOverlapExcluding(2L,START,END,100L)).thenReturn(false);
    when(participantAccessService.canAttend(OWNER,10L)).thenReturn(true);
    when(participantAccessService.canAttend(OWNER,11L)).thenReturn(true);

    var result = service.update(OWNER,command(List.of(10L,11L,10L)));

    assertThat(result.reservationId()).isEqualTo(100L);
    assertThat(result.scheduleId()).isEqualTo(200L);
    assertThat(reservation.getRoom()).isEqualTo(newRoom);
    assertThat(reservation.getTitle()).isEqualTo("Updated planning");
    ArgumentCaptor<ScheduleModificationService.UpdateReservationScheduleCommand> update = ArgumentCaptor
        .forClass(ScheduleModificationService.UpdateReservationScheduleCommand.class);
    verify(scheduleModificationService).update(update.capture());
    assertThat(update.getValue().title()).isEqualTo("Updated planning");
    assertThat(update.getValue().location()).isEqualTo("Iris");
    assertThat(update.getValue().attendeeIds()).containsExactly(10L,11L);
    assertThat(update.getValue().description()).isEqualTo("Updated detail");
  }

  @Test
  void updatesTheConnectedScheduleWithTheCreatorAttendanceChoice() {
    RoomReservationService service = service();
    Room room = Room.of(2L,"Iris",2L,"4F");
    RoomReservation reservation = RoomReservation.of(100L,room,200L,"Old title",START.minusHours(1),
        START,ReservationStatus.RESERVED);
    when(reservationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(reservation));
    when(scheduleModificationService.findReservationSchedule(200L))
        .thenReturn(Optional.of(new ReservationSchedule(200L, 10L)));
    when(roomRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
    when(participantAccessService.canAttend(OWNER,11L)).thenReturn(true);

    service.update(OWNER,new UpdateRoomReservationCommand(100L, 2L, "Updated planning", START, END,
        List.of(11L), true, "Updated detail"));

    ArgumentCaptor<ScheduleModificationService.UpdateReservationScheduleCommand> update = ArgumentCaptor
        .forClass(ScheduleModificationService.UpdateReservationScheduleCommand.class);
    verify(scheduleModificationService).update(update.capture());
    assertThat(update.getValue().attendeeIds()).containsExactly(10L,11L);
  }

  @Test
  void rejectsMissingActorNonOwnerHiddenOrCancelledReservationsAndConflicts() {
    RoomReservationService service = service();
    assertCode(() -> service.update(null,command(List.of(10L))),"RESERVATION_ACTOR_REQUIRED");

    RoomReservation reservation = RoomReservation.of(100L,Room.of(1L,"Orchid",4L,"3F"),200L,"Old",
        START.minusHours(1),START,ReservationStatus.RESERVED);
    when(reservationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(reservation));
    when(scheduleModificationService.findReservationSchedule(200L))
        .thenReturn(Optional.of(new ReservationSchedule(200L, 99L)));
    assertCode(() -> service.update(OWNER,command(List.of(10L))),"ROOM_RESERVATION_NOT_FOUND");

    when(reservationRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());
    assertCode(() -> service.update(OWNER,new UpdateRoomReservationCommand(999L, 2L,
        "Updated planning", START, END, List.of(10L), "Updated detail")),
        "ROOM_RESERVATION_NOT_FOUND");

    RoomReservation cancelled = RoomReservation.of(101L,Room.of(1L,"Orchid",4L,"3F"),201L,"Old",
        START.minusHours(1),START,ReservationStatus.CANCELED);
    when(reservationRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(cancelled));
    when(scheduleModificationService.findReservationSchedule(201L))
        .thenReturn(Optional.of(new ReservationSchedule(201L, 10L)));
    assertCode(() -> service.update(OWNER,new UpdateRoomReservationCommand(101L, 2L,
        "Updated planning", START, END, List.of(10L), "Updated detail")),
        "ROOM_RESERVATION_NOT_EDITABLE");

    when(reservationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(reservation));
    when(scheduleModificationService.findReservationSchedule(200L))
        .thenReturn(Optional.of(new ReservationSchedule(200L, 10L)));
    when(roomRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(Room.of(2L,"Iris",1L,"4F")));
    when(participantAccessService.canAttend(OWNER,10L)).thenReturn(true);
    when(participantAccessService.canAttend(OWNER,11L)).thenReturn(true);
    assertCode(() -> service.update(OWNER,command(List.of(10L,11L))),"ROOM_CAPACITY_EXCEEDED");

    when(roomRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(Room.of(2L,"Iris",4L,"4F")));
    when(reservationRepository.existsReservedOverlapExcluding(2L,START,END,100L)).thenReturn(true);
    assertCode(() -> service.update(OWNER,command(List.of(10L))),"ROOM_RESERVATION_CONFLICT");
  }

  @Test
  void rejectsNullAttendeeWithTheStableValidationError() {
    RoomReservationService service = service();

    assertCode(
        () -> service
            .update(OWNER,
                new UpdateRoomReservationCommand(100L, 2L, "Updated planning", START, END,
                    java.util.Arrays.asList(10L,null), "Updated detail")),
        "ROOM_RESERVATION_INVALID");
  }

  private RoomReservationService service() {
    return new RoomReservationService(roomRepository, reservationRepository,
        participantAccessService, null, scheduleModificationService);
  }

  private UpdateRoomReservationCommand command(List<Long> attendeeIds) {
    return new UpdateRoomReservationCommand(100L, 2L, "Updated planning", START, END, attendeeIds,
        "Updated detail");
  }

  private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action,
      String expectedCode) {
    assertThatThrownBy(action).isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo(expectedCode);
  }
}
