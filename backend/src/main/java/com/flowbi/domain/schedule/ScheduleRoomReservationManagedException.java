package com.flowbi.domain.schedule;

public final class ScheduleRoomReservationManagedException extends RuntimeException {
  public ScheduleRoomReservationManagedException() {
    super("Room reservation linked schedules must be changed through room reservations");
  }
}
