package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService.ReservationScheduleDetails;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RoomReservationDetailServiceTest {

  private final RoomReservationRepository reservationRepository = mock(
      RoomReservationRepository.class);
  private final ScheduleModificationService scheduleModificationService = mock(
      ScheduleModificationService.class);
  private RoomReservationDetailService service;

  @BeforeEach
  void setUp() {
    service = new RoomReservationDetailService(reservationRepository, scheduleModificationService);
  }

  @Test
  void returnsTheSameNotFoundCodeForMissingAndUnownedReservations() {
    when(reservationRepository.findById(1L)).thenReturn(Optional.empty());

    assertNotFound(1L);

    RoomReservation reservation = mock(RoomReservation.class);
    when(reservationRepository.findById(2L)).thenReturn(Optional.of(reservation));
    when(reservation.getScheduleId()).thenReturn(20L);
    when(scheduleModificationService.findReservationScheduleDetails(20L))
        .thenReturn(Optional.of(new ReservationScheduleDetails(99L, "Plan", List.of(99L))));

    assertNotFound(2L);
  }

  private void assertNotFound(Long reservationId) {
    assertThatThrownBy(() -> service.findOwnedReservation(10L,reservationId))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_NOT_FOUND");
  }
}
