package com.flowbi.domain.schedule.port;

import com.flowbi.domain.schedule.ScheduleCreateCommand;
import com.flowbi.domain.schedule.ScheduleUpdateCommand;

/**
 * Boundary owned by Calendar; an organization/project adapter is supplied after
 * Task 7.
 */
public interface ScheduleReferenceValidator {

  void validateForCreation(ScheduleCreateCommand command);

  default void validateForUpdate(long creatorId,ScheduleUpdateCommand command) {
    validateForCreation(command.asCreateCommand(creatorId));
  }
}
