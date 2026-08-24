package com.flowbi.domain.schedule.exception;

public class PersonalScheduleRelationsForbiddenException extends RuntimeException {

  public PersonalScheduleRelationsForbiddenException() {
    super("Personal schedules cannot have participants or explicit user targets");
  }
}
