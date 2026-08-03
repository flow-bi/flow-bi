package com.flowbi.domain.schedule;

public final class SchedulePersistenceException extends RuntimeException {
  public SchedulePersistenceException() {
    super("Unable to save schedule");
  }
}
