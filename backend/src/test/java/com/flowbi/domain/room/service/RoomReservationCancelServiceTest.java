package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService.ReservationSchedule;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RoomReservationCancelServiceTest {

  private static final ReservationActor OWNER = new ReservationActor(10L);

  @Mock
  private RoomReservationRepository reservationRepository;
  @Mock
  private ScheduleModificationService scheduleModificationService;

  @Test
  void cancelsTheOwnedReservationAndConnectedSchedule() {
    RoomReservation reservation = reservation(ReservationStatus.RESERVED);
    when(reservationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(reservation));
    when(scheduleModificationService.findReservationScheduleForCancellation(200L))
        .thenReturn(Optional.of(new ReservationSchedule(200L, 10L)));

    service().cancel(OWNER,100L);

    assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELED);
    assertThat(reservation.getCancelledAt()).isNotNull();
    verify(scheduleModificationService).cancelReservationSchedule(
        org.mockito.ArgumentMatchers.eq(200L),org.mockito.ArgumentMatchers.eq(10L),
        org.mockito.ArgumentMatchers.any());
  }

  @Test
  void hidesMissingAndUnownedReservationsWithTheSameNotFoundCode() {
    when(reservationRepository.findByIdForUpdate(100L)).thenReturn(Optional.empty());
    assertNotFound(() -> service().cancel(OWNER,100L));

    RoomReservation reservation = reservation(ReservationStatus.RESERVED);
    when(reservationRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(reservation));
    when(scheduleModificationService.findReservationScheduleForCancellation(200L))
        .thenReturn(Optional.of(new ReservationSchedule(200L, 99L)));
    assertNotFound(() -> service().cancel(OWNER,101L));
  }

  @Test
  void repeatsCancellationWithoutChangingTheConnectedScheduleAgain() {
    RoomReservation reservation = reservation(ReservationStatus.CANCELED);
    when(reservationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(reservation));
    when(scheduleModificationService.findReservationScheduleForCancellation(200L))
        .thenReturn(Optional.of(new ReservationSchedule(200L, 10L)));

    service().cancel(OWNER,100L);

    verify(scheduleModificationService).findReservationScheduleForCancellation(200L);
  }

  private RoomReservationService service() {
    return new RoomReservationService(null, reservationRepository, null, null,
        scheduleModificationService);
  }

  private RoomReservation reservation(ReservationStatus status) {
    return RoomReservation.of(100L,Room.of(1L,"Orchid",4L,"3F"),200L,"Planning",
        LocalDateTime.of(2026,8,10,10,0),LocalDateTime.of(2026,8,10,11,0),status);
  }

  private void assertNotFound(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
    assertThatThrownBy(action).isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_NOT_FOUND");
  }
}
