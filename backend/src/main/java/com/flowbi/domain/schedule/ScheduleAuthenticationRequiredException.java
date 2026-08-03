package com.flowbi.domain.schedule;

public final class ScheduleAuthenticationRequiredException extends RuntimeException {
  public ScheduleAuthenticationRequiredException() {
    super("Authentication is required");
  }
}
