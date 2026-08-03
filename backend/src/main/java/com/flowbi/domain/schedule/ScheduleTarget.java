package com.flowbi.domain.schedule;

import java.util.Objects;

public record ScheduleTarget(ScheduleTargetType type, Long targetId) {
  public ScheduleTarget {
    Objects.requireNonNull(type,"type is required");
    Objects.requireNonNull(targetId,"targetId is required");
  }

  public static ScheduleTarget team(Long teamId) {
    return new ScheduleTarget(ScheduleTargetType.TEAM, teamId);
  }

  public static ScheduleTarget project(Long projectId) {
    return new ScheduleTarget(ScheduleTargetType.PROJECT, projectId);
  }

  public static ScheduleTarget user(Long userId) {
    return new ScheduleTarget(ScheduleTargetType.USER, userId);
  }
}
