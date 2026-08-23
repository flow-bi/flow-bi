package com.flowbi.domain.team.service;

public class TeamNameConflictException extends RuntimeException {
  public TeamNameConflictException(String teamName) {
    super("Duplicate team name: " + teamName);
  }
}
