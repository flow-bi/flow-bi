package com.flowbi.domain.schedule.dto;

import com.flowbi.domain.schedule.entity.ScheduleColorLabel;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import com.flowbi.domain.schedule.exception.PersonalScheduleRelationsForbiddenException;
import java.time.OffsetDateTime;
import java.util.List;

public record ScheduleWriteRequest(String title, ScheduleType type, ScheduleVisibility visibility,
    OffsetDateTime startAt, OffsetDateTime endAt, boolean allDay, ScheduleColorLabel colorLabel,
    String content, String location, boolean creatorAttends, List<Long> participantIds,
    List<Long> userTargetIds, List<Long> teamTargetIds, List<Long> projectTargetIds) {

  public ScheduleCreateCommand toCreateCommand(long creatorId) {
    rejectPersonalRelations();
    return ScheduleCreateCommand.of(creatorId,title,type,visibility,startAt,endAt,allDay,colorLabel,
        content,location,creatorAttends,participantIds,userTargetIds,teamTargetIds,
        projectTargetIds);
  }

  public ScheduleUpdateCommand toUpdateCommand() {
    rejectPersonalRelations();
    return ScheduleUpdateCommand.of(title,type,visibility,startAt,endAt,allDay,colorLabel,content,
        location,creatorAttends,participantIds,userTargetIds,teamTargetIds,projectTargetIds);
  }

  private void rejectPersonalRelations() {
    if (type == ScheduleType.PERSONAL && (hasValues(participantIds) || hasValues(userTargetIds)
        || hasValues(teamTargetIds) || hasValues(projectTargetIds))) {
      throw new PersonalScheduleRelationsForbiddenException();
    }
  }

  private boolean hasValues(List<Long> values) {
    return values != null && !values.isEmpty();
  }
}
