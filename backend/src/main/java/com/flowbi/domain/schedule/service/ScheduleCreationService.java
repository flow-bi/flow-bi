package com.flowbi.domain.schedule.service;

public interface ScheduleCreationService {

  CreatedSchedule create(CreateScheduleCommand command);

  record CreatedSchedule(Long scheduleId) {
  }
}
