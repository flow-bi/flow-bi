package com.flowbi.domain.team.service;

public class TeamHierarchyInconsistentException extends RuntimeException {

  public TeamHierarchyInconsistentException() {
    super("Team hierarchy data is inconsistent.");
  }
}
