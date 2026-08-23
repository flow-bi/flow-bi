package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.exception.PersonalScheduleRelationsForbiddenException;
import java.util.List;

final class PersonalScheduleRelationValidator {

  private PersonalScheduleRelationValidator() {
  }

  static void reject(ScheduleType type,List<Long> participantIds,List<Long> userTargetIds,
      List<Long> teamTargetIds,List<Long> projectTargetIds) {
    if (type == ScheduleType.PERSONAL && (!participantIds.isEmpty() || !userTargetIds.isEmpty()
        || !teamTargetIds.isEmpty() || !projectTargetIds.isEmpty())) {
      throw new PersonalScheduleRelationsForbiddenException();
    }
  }
}
