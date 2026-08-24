package com.flowbi.domain.team.service;

public class TeamInUseException extends RuntimeException {

  public TeamInUseException(Long teamId) {
    super("Team is assigned to one or more users: " + teamId);
  }
}
