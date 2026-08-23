package com.flowbi.domain.team.service;

public class TeamHasChildrenException extends RuntimeException {

  public TeamHasChildrenException(Long teamId) {
    super("Team has direct children: " + teamId);
  }
}
