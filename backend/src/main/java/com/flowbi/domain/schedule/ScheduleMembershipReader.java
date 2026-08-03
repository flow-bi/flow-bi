package com.flowbi.domain.schedule;

import java.util.Set;

public interface ScheduleMembershipReader {
  boolean belongsToAnyTeam(Long userId,Set<Long> teamIds);
  boolean participatesInAnyProject(Long userId,Set<Long> projectIds);

  default boolean canAccessAllTeams(Long userId,Set<Long> teamIds) {
    return teamIds.stream().allMatch(teamId -> belongsToAnyTeam(userId,Set.of(teamId)));
  }

  default boolean canAccessAllProjects(Long userId,Set<Long> projectIds) {
    return projectIds.stream()
        .allMatch(projectId -> participatesInAnyProject(userId,Set.of(projectId)));
  }

  static ScheduleMembershipReader none() {
    return new ScheduleMembershipReader() {
      @Override
      public boolean belongsToAnyTeam(Long userId,Set<Long> teamIds) {
        return false;
      }
      @Override
      public boolean participatesInAnyProject(Long userId,Set<Long> projectIds) {
        return false;
      }
    };
  }
}
