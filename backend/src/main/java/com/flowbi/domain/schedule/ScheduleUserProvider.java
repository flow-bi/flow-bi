package com.flowbi.domain.schedule;

import java.util.Optional;

public interface ScheduleUserProvider {
  Optional<Long> currentUserId();

  static ScheduleUserProvider unauthenticated() {
    return Optional::empty;
  }
}
