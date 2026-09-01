package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService.ReservationSchedule;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ReservationScheduleOwnershipVerifierTest {

  private static final ReservationActor OWNER = new ReservationActor(10L);

  @Mock
  private ScheduleModificationService scheduleModificationService;

  @Test
  void returnsTheOwnedScheduleForUpdateAndCancellation() {
    ReservationScheduleOwnershipVerifier verifier = verifier();
    ReservationSchedule schedule = new ReservationSchedule(20L, 10L);
    when(scheduleModificationService.findReservationSchedule(20L))
        .thenReturn(Optional.of(schedule));
    when(scheduleModificationService.findReservationScheduleForCancellation(20L))
        .thenReturn(Optional.of(schedule));

    assertThat(verifier.findOwnedForUpdate(20L,OWNER)).isEqualTo(schedule);
    assertThat(verifier.findOwnedForCancellation(20L,OWNER)).isEqualTo(schedule);
  }

  @Test
  void hidesMissingAndUnownedSchedules() {
    ReservationScheduleOwnershipVerifier verifier = verifier();
    when(scheduleModificationService.findReservationSchedule(20L))
        .thenReturn(Optional.of(new ReservationSchedule(20L, 99L)));

    assertThatThrownBy(() -> verifier.findOwnedForUpdate(20L,OWNER))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_NOT_FOUND");
  }

  private ReservationScheduleOwnershipVerifier verifier() {
    return new ReservationScheduleOwnershipVerifier(scheduleModificationService);
  }
}
