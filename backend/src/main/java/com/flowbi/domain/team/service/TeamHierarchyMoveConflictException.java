package com.flowbi.domain.team.service;

public class TeamHierarchyMoveConflictException extends RuntimeException {

  public TeamHierarchyMoveConflictException(Long teamId, Long newParentTeamId) {
    super("Team move conflicts with the current hierarchy: " + teamId + " -> " + newParentTeamId);
  }
}
