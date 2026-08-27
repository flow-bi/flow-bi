package com.flowbi.domain.room.service;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService.ReservationSchedule;
import org.springframework.stereotype.Component;

@Component
class ReservationScheduleOwnershipVerifier {

  private final ScheduleModificationService scheduleModificationService;

  ReservationScheduleOwnershipVerifier(ScheduleModificationService scheduleModificationService) {
    this.scheduleModificationService = scheduleModificationService;
  }

  ReservationSchedule findOwnedForUpdate(Long scheduleId,ReservationActor actor) {
    return scheduleModificationService.findReservationSchedule(scheduleId)
        .filter(schedule -> actor.userId().equals(schedule.creatorId()))
        .orElseThrow(this::notFound);
  }

  ReservationSchedule findOwnedForCancellation(Long scheduleId,ReservationActor actor) {
    return scheduleModificationService.findReservationScheduleForCancellation(scheduleId)
        .filter(schedule -> actor.userId().equals(schedule.creatorId()))
        .orElseThrow(this::notFound);
  }

  private RoomReservationApplicationException notFound() {
    return new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND");
  }
}
