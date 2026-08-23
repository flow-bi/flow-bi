package com.flowbi.domain.team.dto;

public class TeamValidationException extends RuntimeException {

  public TeamValidationException(String message) {
    super(message);
  }
}
