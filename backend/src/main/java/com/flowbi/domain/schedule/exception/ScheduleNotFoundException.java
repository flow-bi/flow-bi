package com.flowbi.domain.schedule.exception;

public class ScheduleNotFoundException extends RuntimeException {

  public ScheduleNotFoundException() {
    super("Schedule not found");
  }
}
