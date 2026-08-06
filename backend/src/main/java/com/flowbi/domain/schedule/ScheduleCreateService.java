package com.flowbi.domain.schedule;

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
