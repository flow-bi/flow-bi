package com.flowbi.domain.schedule;

public class ScheduleNotFoundException extends RuntimeException {

  public ScheduleNotFoundException() {
    super("Schedule not found");
  }
}
