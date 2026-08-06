package com.flowbi.domain.schedule;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ScheduleCreateTransaction {

  private final ScheduleRepository scheduleRepository;

  ScheduleCreateTransaction(ScheduleRepository scheduleRepository) {
    this.scheduleRepository = scheduleRepository;
  }

  @Transactional
  public Schedule create(ScheduleCreateCommand command) {
    return scheduleRepository.saveAndFlush(Schedule.create(command));
  }
}
