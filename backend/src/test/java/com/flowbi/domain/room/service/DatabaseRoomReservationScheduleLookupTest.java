package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.repository.RoomReservationRepository;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class DatabaseRoomReservationScheduleLookupTest {

  @Test
  void identifiesSchedulesThatAreManagedByRoomReservations() {
    RoomReservationRepository reservations = mock(RoomReservationRepository.class);
    when(reservations.existsByScheduleId(10L)).thenReturn(true);
    var lookup = new DatabaseRoomReservationScheduleLookup(reservations);

    assertThat(lookup.isManagedSchedule(10L)).isTrue();
    assertThat(lookup.isManagedSchedule(11L)).isFalse();
  }

  @Test
  void resolvesManagedScheduleIdsWithOneRepositoryQuery() {
    RoomReservationRepository reservations = mock(RoomReservationRepository.class);
    when(reservations.findScheduleIdsIn(List.of(10L,11L,12L))).thenReturn(List.of(10L,12L));
    var lookup = new DatabaseRoomReservationScheduleLookup(reservations);

    assertThat(lookup.managedScheduleIds(List.of(10L,11L,12L))).isEqualTo(Set.of(10L,12L));
  }
}
