package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;

import com.flowbi.domain.schedule.port.ScheduleReferenceValidator;
import org.springframework.stereotype.Service;

@Service
public class ScheduleUpdateService {

  private final ScheduleReferenceValidator referenceValidator;
  private final ScheduleUpdateTransaction transaction;

  public ScheduleUpdateService(ScheduleReferenceValidator referenceValidator,
      ScheduleUpdateTransaction transaction) {
    this.referenceValidator = referenceValidator;
    this.transaction = transaction;
  }

  public Schedule update(long actorId,long scheduleId,ScheduleUpdateCommand command) {
    return transaction.update(actorId,scheduleId,command,referenceValidator);
  }
}
