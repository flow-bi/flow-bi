package com.flowbi.domain.schedule;

public final class ScheduleValidationException extends RuntimeException {
  public ScheduleValidationException() {
    super("Invalid schedule creation request");
  }
}
