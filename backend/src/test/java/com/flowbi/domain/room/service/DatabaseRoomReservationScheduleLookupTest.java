package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.repository.RoomReservationRepository;
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
}
