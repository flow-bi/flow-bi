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
public class ScheduleCreateService {

  private final ScheduleReferenceValidator referenceValidator;
  private final ScheduleCreateTransaction transaction;

  public ScheduleCreateService(ScheduleReferenceValidator referenceValidator,
      ScheduleCreateTransaction transaction) {
    this.referenceValidator = referenceValidator;
    this.transaction = transaction;
  }

  public Schedule create(ScheduleCreateCommand command) {
    referenceValidator.validateForCreation(command);
    return transaction.create(command);
  }
}
