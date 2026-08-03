package com.flowbi.domain.schedule;

public interface ScheduleActiveUserReader {
  boolean isAccessibleActiveUser(Long userId);

  static ScheduleActiveUserReader none() {
    return userId -> false;
  }
}
