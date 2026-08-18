package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;

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
