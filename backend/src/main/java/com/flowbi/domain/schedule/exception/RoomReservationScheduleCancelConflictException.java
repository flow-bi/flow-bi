package com.flowbi.domain.schedule.exception;

public class RoomReservationScheduleCancelConflictException extends RuntimeException {

  public RoomReservationScheduleCancelConflictException() {
    super("Connected reservation schedule cannot be cancelled");
  }
}
