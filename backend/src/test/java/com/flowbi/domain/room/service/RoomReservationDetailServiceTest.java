package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.dto.RoomReservationDetailResponse;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService.ReservationScheduleDetails;
import com.flowbi.domain.schedule.service.ScheduleIdentityService;
import com.flowbi.domain.schedule.dto.AttendeeCandidate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RoomReservationDetailServiceTest {

  private final RoomReservationRepository reservationRepository = mock(
      RoomReservationRepository.class);
  private final ScheduleModificationService scheduleModificationService = mock(
      ScheduleModificationService.class);
  private final ScheduleIdentityService scheduleIdentityService = mock(
      ScheduleIdentityService.class);
  private RoomReservationDetailService service;

  @BeforeEach
  void setUp() {
    service = new RoomReservationDetailService(reservationRepository, scheduleModificationService,
        scheduleIdentityService);
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
    verifyNoInteractions(scheduleIdentityService);
  }

  @Test
  void returnsAttendeeDisplayNamesInTheSameOrderAsAttendeeIdsForTheOwner() {
    RoomReservation reservation = mock(RoomReservation.class);
    when(reservationRepository.findById(2L)).thenReturn(Optional.of(reservation));
    when(reservation.getScheduleId()).thenReturn(20L);
    when(reservation.getId()).thenReturn(2L);
    when(reservation.getRoom()).thenReturn(mock(com.flowbi.domain.room.entity.Room.class));
    when(reservation.getRoom().getId()).thenReturn(3L);
    when(reservation.getTitle()).thenReturn("Planning");
    when(reservation.getStatus())
        .thenReturn(com.flowbi.domain.room.entity.ReservationStatus.RESERVED);
    when(scheduleModificationService.findReservationScheduleDetails(20L))
        .thenReturn(Optional.of(new ReservationScheduleDetails(10L, "Plan", List.of(12L,11L))));
    when(scheduleIdentityService.findUserDisplayNames(List.of(12L,11L)))
        .thenReturn(List.of(new AttendeeCandidate(12L, "Kim"),new AttendeeCandidate(11L, "Lee")));

    var response = service.findOwnedReservation(10L,2L);

    assertThat(response.attendeeIds()).containsExactly(12L,11L);
    assertThat(response.attendees()).containsExactly(
        new RoomReservationDetailResponse.Attendee(12L, "Kim"),
        new RoomReservationDetailResponse.Attendee(11L, "Lee"));
  }

  @Test
  void separatesTheCreatorAttendanceChoiceFromTheSearchableAttendees() {
    RoomReservation reservation = mock(RoomReservation.class);
    when(reservationRepository.findById(2L)).thenReturn(Optional.of(reservation));
    when(reservation.getScheduleId()).thenReturn(20L);
    when(reservation.getId()).thenReturn(2L);
    when(reservation.getRoom()).thenReturn(mock(com.flowbi.domain.room.entity.Room.class));
    when(reservation.getRoom().getId()).thenReturn(3L);
    when(reservation.getTitle()).thenReturn("Planning");
    when(reservation.getStatus())
        .thenReturn(com.flowbi.domain.room.entity.ReservationStatus.RESERVED);
    when(scheduleModificationService.findReservationScheduleDetails(20L))
        .thenReturn(Optional.of(new ReservationScheduleDetails(10L, "Plan", List.of(10L,12L))));
    when(scheduleIdentityService.findUserDisplayNames(List.of(12L)))
        .thenReturn(List.of(new AttendeeCandidate(12L, "Kim")));

    var response = service.findOwnedReservation(10L,2L);

    assertThat(response.creatorAttends()).isTrue();
    assertThat(response.attendeeIds()).containsExactly(12L);
    assertThat(response.attendees())
        .containsExactly(new RoomReservationDetailResponse.Attendee(12L, "Kim"));
  }

  private void assertNotFound(Long reservationId) {
    assertThatThrownBy(() -> service.findOwnedReservation(10L,reservationId))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_NOT_FOUND");
  }
}
