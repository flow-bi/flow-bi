package com.flowbi.domain.team.service;

public class TeamNotFoundException extends RuntimeException {
  public TeamNotFoundException(Long teamId) {
    super("Team not found: " + teamId);
  }
}
