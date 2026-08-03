package com.flowbi.domain.schedule;

public final class ScheduleNotFoundException extends RuntimeException {
  public ScheduleNotFoundException() {
    super("Schedule not found");
  }
}
