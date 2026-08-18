package com.flowbi.domain.schedule.port;

import com.flowbi.domain.schedule.dto.ScheduleCreateCommand;
import com.flowbi.domain.schedule.dto.ScheduleUpdateCommand;

/**
 * Calendar-owned boundary implemented by the organization/project persistence
 * adapter at the application edge.
 */
public interface ScheduleReferenceValidator {

  void validateForCreation(ScheduleCreateCommand command);

  default void validateForUpdate(long creatorId,ScheduleUpdateCommand command) {
    validateForCreation(command.asCreateCommand(creatorId));
  }
}
