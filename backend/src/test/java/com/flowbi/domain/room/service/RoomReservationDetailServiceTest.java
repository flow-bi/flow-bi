package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.entity.Schedule;
import jakarta.persistence.EntityManager;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RoomReservationDetailServiceTest {

  private final RoomReservationRepository reservationRepository = mock(
      RoomReservationRepository.class);
  private final EntityManager entityManager = mock(EntityManager.class);
  private RoomReservationDetailService service;

  @BeforeEach
  void setUp() {
    service = new RoomReservationDetailService(reservationRepository, entityManager);
  }

  @Test
  void returnsTheSameNotFoundCodeForMissingAndUnownedReservations() {
    when(reservationRepository.findById(1L)).thenReturn(Optional.empty());

    assertNotFound(1L);

    RoomReservation reservation = mock(RoomReservation.class);
    Schedule schedule = mock(Schedule.class);
    when(reservationRepository.findById(2L)).thenReturn(Optional.of(reservation));
    when(reservation.getScheduleId()).thenReturn(20L);
    when(entityManager.find(Schedule.class,20L)).thenReturn(schedule);
    when(schedule.isRoomReservation()).thenReturn(true);
    when(schedule.getCreatorId()).thenReturn(99L);

    assertNotFound(2L);
  }

  private void assertNotFound(Long reservationId) {
    assertThatThrownBy(() -> service.findOwnedReservation(10L,reservationId))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_NOT_FOUND");
  }
}
