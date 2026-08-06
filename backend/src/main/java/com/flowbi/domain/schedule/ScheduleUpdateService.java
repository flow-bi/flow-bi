package com.flowbi.domain.schedule;

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
