package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.ReservationDisplayStatus;
import com.flowbi.domain.room.dto.RoomAvailabilityQuery;
import com.flowbi.domain.room.dto.RoomAvailabilityResponse;
import com.flowbi.domain.room.dto.RoomDetailResponse;
import com.flowbi.domain.room.dto.RoomNotFoundException;
import com.flowbi.domain.room.dto.RoomQueryValidationException;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RoomAvailabilityServiceTest {

  private static final LocalDate DATE = LocalDate.of(2026,8,10);
  private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-10T00:30:00Z"),
      ZoneId.of("Asia/Seoul"));

  @Mock
  private RoomRepository roomRepository;

  @Mock
  private RoomReservationRepository reservationRepository;

  private RoomAvailabilityService service;

  @org.junit.jupiter.api.BeforeEach
  void setUp() {
    service = new RoomAvailabilityService(roomRepository, reservationRepository, CLOCK);
  }

  @Test
  void returnsAllRoomsWithDefaultImageAndAnEmptyReservationList() {
    when(roomRepository.findAllByOrderByIdAsc()).thenReturn(List.of(room(1L,"A",4),room(2L,"B",8)));
    when(reservationRepository.findActiveOverlapping(any(),any())).thenReturn(List.of());

    RoomAvailabilityResponse response = service
        .findAvailability(RoomAvailabilityQuery.forDate(DATE));

    assertThat(response.rooms()).extracting(room -> room.name()).containsExactly("A","B");
    assertThat(response.rooms()).allSatisfy(room -> {
      assertThat(room.usesDefaultImage()).isTrue();
      assertThat(room.reservations()).isEmpty();
    });
  }

  @Test
  void returnsAnEmptyRoomListWhenNoRoomsAreRegistered() {
    when(roomRepository.findAllByOrderByIdAsc()).thenReturn(List.of());
    when(reservationRepository.findActiveOverlapping(any(),any())).thenReturn(List.of());

    RoomAvailabilityResponse response = service
        .findAvailability(RoomAvailabilityQuery.forDate(DATE));

    assertThat(response.rooms()).isEmpty();
  }

  @Test
  void returnsRoomDetailsAsADtoWithoutExposingTheEntity() {
    when(roomRepository.findById(1L)).thenReturn(Optional.of(room(1L,"A",4)));

    RoomDetailResponse response = service.findRoomDetail(1L);

    assertThat(response).isEqualTo(new RoomDetailResponse(1L, "A", 4L, "Floor 1", true));
    assertThatThrownBy(() -> service.findRoomDetail(99L)).isInstanceOf(RoomNotFoundException.class);
  }

  @Test
  void mapsOnlyActiveOverlappingReservationsAndUsesHalfOpenBoundaries() {
    Room room = room(1L,"A",4);
    when(roomRepository.findAllByOrderByIdAsc()).thenReturn(List.of(room));
    when(reservationRepository.findActiveOverlapping(any(),any())).thenReturn(List.of(
        reservation(1L,room,LocalTime.of(9,0),LocalTime.of(10,0),ReservationStatus.RESERVED),
        reservation(2L,room,LocalTime.of(10,0),LocalTime.of(11,0),ReservationStatus.RESERVED),
        reservation(3L,room,LocalTime.of(11,0),LocalTime.of(12,0),ReservationStatus.CANCELED)));

    RoomAvailabilityResponse response = service.findAvailability(
        new RoomAvailabilityQuery(DATE, LocalTime.of(9,0), LocalTime.of(10,0), null, null));

    assertThat(response.rooms().get(0).reservations()).extracting(reservation -> reservation.id())
        .containsExactly(1L);
    assertThat(response.rooms().get(0).reservations().get(0).displayStatus())
        .isEqualTo(ReservationDisplayStatus.IN_USE);
  }

  @Test
  void prioritizesMatchesWithoutRemovingNonMatchingRoomsAndKeepsTiesStable() {
    Room small = room(1L,"Small",2);
    Room matchingFirst = room(2L,"Matching first",8);
    Room matchingSecond = room(3L,"Matching second",10);
    when(roomRepository.findAllByOrderByIdAsc())
        .thenReturn(List.of(small,matchingFirst,matchingSecond));
    when(reservationRepository.findActiveOverlapping(any(),any())).thenReturn(List.of());

    RoomAvailabilityResponse response = service.findAvailability(
        new RoomAvailabilityQuery(DATE, LocalTime.of(9,0), LocalTime.of(18,0), 6, null));

    assertThat(response.rooms()).extracting(room -> room.name()).containsExactly("Matching first",
        "Matching second","Small");
  }

  @Test
  void prioritizesAvailableTimeAndRequestedDisplayStatusWithoutFilteringRooms() {
    Room occupied = room(1L,"Occupied",4);
    Room available = room(2L,"Available",4);
    when(roomRepository.findAllByOrderByIdAsc()).thenReturn(List.of(occupied,available));
    when(reservationRepository.findActiveOverlapping(any(),any())).thenReturn(List.of(
        reservation(1L,occupied,LocalTime.of(9,0),LocalTime.of(10,0),ReservationStatus.RESERVED)));

    RoomAvailabilityResponse timePriority = service.findAvailability(
        new RoomAvailabilityQuery(DATE, LocalTime.of(9,0), LocalTime.of(10,0), null, null));
    RoomAvailabilityResponse statusPriority = service.findAvailability(new RoomAvailabilityQuery(
        DATE, LocalTime.of(9,0), LocalTime.of(18,0), null, ReservationDisplayStatus.IN_USE));

    assertThat(timePriority.rooms()).extracting(room -> room.name()).containsExactly("Available",
        "Occupied");
    assertThat(statusPriority.rooms()).extracting(room -> room.name()).containsExactly("Occupied",
        "Available");
  }

  @Test
  void rejectsInvalidOrUnboundedBusinessHourPeriodsWithAStableErrorCode() {
    assertThatThrownBy(() -> service.findAvailability(
        new RoomAvailabilityQuery(DATE, LocalTime.of(18,0), LocalTime.of(18,0), null, null)))
        .isInstanceOf(RoomQueryValidationException.class)
        .extracting(error -> ((RoomQueryValidationException) error).code())
        .isEqualTo("ROOM_QUERY_INVALID");
    assertThatThrownBy(() -> service.findAvailability(
        new RoomAvailabilityQuery(DATE, LocalTime.of(8,59), LocalTime.of(10,0), null, null)))
        .isInstanceOf(RoomQueryValidationException.class);
  }

  private Room room(long id,String name,long capacity) {
    return Room.of(id,name,capacity,"Floor 1");
  }

  private RoomReservation reservation(long id,Room room,LocalTime start,LocalTime end,
      ReservationStatus status) {
    return RoomReservation.of(id,room,10L + id,"Planning",LocalDateTime.of(DATE,start),
        LocalDateTime.of(DATE,end),status);
  }
}
