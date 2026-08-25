package com.flowbi.domain.schedule.entity;

public enum ScheduleVisibility {
  PRIVATE, TEAM, PROJECT;

  public static ScheduleVisibility defaultFor(ScheduleType type) {
    return switch (type) {
      case PERSONAL -> PRIVATE;
      case TEAM -> TEAM;
      case PROJECT -> PROJECT;
    };
  }
}
