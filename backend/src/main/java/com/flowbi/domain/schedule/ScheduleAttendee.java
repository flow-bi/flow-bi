package com.flowbi.domain.schedule;

import java.util.Objects;

public record ScheduleAttendee(Long userId) {
  public ScheduleAttendee {
    Objects.requireNonNull(userId,"userId is required");
  }
}
