package com.flowbi.domain.schedule;

import java.util.Set;

final class ScheduleAccessPolicy {

  private final ScheduleMembershipReader membershipReader;

  ScheduleAccessPolicy(ScheduleMembershipReader membershipReader) {
    this.membershipReader = membershipReader;
  }

  boolean canRead(Long userId,Schedule schedule) {
    if (schedule.getAttendees().stream().anyMatch(attendee -> attendee.userId().equals(userId))) {
      return true;
    }
    return switch (schedule.getType()) {
      case PERSONAL -> schedule.getCreatorId().equals(userId);
      case TEAM -> belongsToTargetTeam(userId,schedule);
      case PROJECT -> participatesInTargetProject(userId,schedule);
    };
  }

  private boolean belongsToTargetTeam(Long userId,Schedule schedule) {
    if (hasUnexpectedTargetType(schedule,ScheduleTargetType.TEAM)) {
      return false;
    }
    Set<Long> teamIds = targetIds(schedule,ScheduleTargetType.TEAM);
    return !teamIds.isEmpty() && membershipReader.belongsToAnyTeam(userId,teamIds);
  }

  private boolean participatesInTargetProject(Long userId,Schedule schedule) {
    if (hasUnexpectedTargetType(schedule,ScheduleTargetType.PROJECT)) {
      return false;
    }
    Set<Long> projectIds = targetIds(schedule,ScheduleTargetType.PROJECT);
    return !projectIds.isEmpty() && membershipReader.participatesInAnyProject(userId,projectIds);
  }

  private boolean hasUnexpectedTargetType(Schedule schedule,ScheduleTargetType expectedType) {
    return schedule.getTargets().stream().anyMatch(target -> target.type() != expectedType);
  }

  private Set<Long> targetIds(Schedule schedule,ScheduleTargetType targetType) {
    return schedule.getTargets().stream().filter(target -> target.type() == targetType)
        .map(ScheduleTarget::targetId).collect(java.util.stream.Collectors.toUnmodifiableSet());
  }
}
