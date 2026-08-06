package com.flowbi.domain.schedule;

import java.util.Set;

final class ScheduleAccessPolicy {

  boolean isVisible(Schedule schedule,long actorId,Set<Long> memberTeamIds,
      Set<Long> memberProjectIds) {
    return schedule.getCreatorId() == actorId || isParticipant(schedule,actorId)
        || isExplicitUserTarget(schedule,actorId)
        || hasTypeBasedAccess(schedule,memberTeamIds,memberProjectIds);
  }

  private boolean isParticipant(Schedule schedule,long actorId) {
    return schedule.getParticipants().stream()
        .anyMatch(participant -> participant.getUserId() == actorId);
  }

  private boolean isExplicitUserTarget(Schedule schedule,long actorId) {
    return schedule.getTargets().stream().anyMatch(
        target -> target.getType() == ScheduleTargetType.USER && target.getUserId() == actorId);
  }

  private boolean hasTypeBasedAccess(Schedule schedule,Set<Long> memberTeamIds,
      Set<Long> memberProjectIds) {
    return switch (schedule.getType()) {
      case PERSONAL -> false;
      case TEAM ->
        schedule.getTargets().stream().filter(target -> target.getType() == ScheduleTargetType.TEAM)
            .map(ScheduleTarget::getTeamId).anyMatch(memberTeamIds::contains);
      case PROJECT -> schedule.getTargets().stream()
          .filter(target -> target.getType() == ScheduleTargetType.PROJECT)
          .map(ScheduleTarget::getProjectId).anyMatch(memberProjectIds::contains);
    };
  }
}
