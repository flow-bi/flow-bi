package com.flowbi.domain.schedule.dto;

import com.flowbi.domain.schedule.entity.ScheduleColorLabel;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import com.flowbi.domain.schedule.exception.InvalidScheduleCreateCommandException;
import java.time.OffsetDateTime;
import java.util.List;

public record ScheduleCreateCommand(long creatorId, String title, ScheduleType type,
    ScheduleVisibility visibility, OffsetDateTime startAt, OffsetDateTime endAt, boolean allDay,
    ScheduleColorLabel colorLabel, String content, String location, boolean creatorAttends,
    List<Long> participantIds, List<Long> userTargetIds, List<Long> teamTargetIds,
    List<Long> projectTargetIds) {

  public static ScheduleCreateCommand of(long creatorId,String title,ScheduleType type,
      ScheduleVisibility visibility,OffsetDateTime startAt,OffsetDateTime endAt,boolean allDay,
      ScheduleColorLabel colorLabel,String content,String location,boolean creatorAttends,
      List<Long> participantIds,List<Long> userTargetIds,List<Long> teamTargetIds,
      List<Long> projectTargetIds) {
    ScheduleCreateCommand command = new ScheduleCreateCommand(creatorId, title, type, visibility,
        startAt, endAt, allDay, colorLabel, content, location, creatorAttends,
        ScheduleWriteCommandValidator.normalizeIds(participantIds),
        ScheduleWriteCommandValidator.normalizeIds(userTargetIds),
        ScheduleWriteCommandValidator.normalizeIds(teamTargetIds),
        ScheduleWriteCommandValidator.normalizeIds(projectTargetIds));
    command.validate();
    return command;
  }

  private void validate() {
    ScheduleWriteCommandValidator.validate(creatorId,title,type,visibility,startAt,endAt,colorLabel,
        participantIds,userTargetIds,teamTargetIds,projectTargetIds,
        InvalidScheduleCreateCommandException::new);
  }
}
