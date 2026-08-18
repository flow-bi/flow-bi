package com.flowbi.domain.schedule.port;

public class InvalidScheduleReferenceException extends RuntimeException {

  public InvalidScheduleReferenceException(String message) {
    super(message);
  }
}
