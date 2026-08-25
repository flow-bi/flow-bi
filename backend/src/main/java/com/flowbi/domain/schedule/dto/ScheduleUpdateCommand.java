package com.flowbi.domain.schedule.dto;

import com.flowbi.domain.schedule.entity.ScheduleColorLabel;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import com.flowbi.domain.schedule.exception.InvalidScheduleUpdateCommandException;
import java.time.OffsetDateTime;
import java.util.List;

public record ScheduleUpdateCommand(String title, ScheduleType type, ScheduleVisibility visibility,
    OffsetDateTime startAt, OffsetDateTime endAt, boolean allDay, ScheduleColorLabel colorLabel,
    String content, String location, boolean creatorAttends, List<Long> participantIds,
    List<Long> userTargetIds, List<Long> teamTargetIds, List<Long> projectTargetIds) {

  public static ScheduleUpdateCommand of(String title,ScheduleType type,
      ScheduleVisibility visibility,OffsetDateTime startAt,OffsetDateTime endAt,boolean allDay,
      ScheduleColorLabel colorLabel,String content,String location,boolean creatorAttends,
      List<Long> participantIds,List<Long> userTargetIds,List<Long> teamTargetIds,
      List<Long> projectTargetIds) {
    ScheduleUpdateCommand command = new ScheduleUpdateCommand(title, type, visibility, startAt,
        endAt, allDay, colorLabel, content, location, creatorAttends,
        ScheduleWriteCommandValidator.normalizeIds(participantIds),
        ScheduleWriteCommandValidator.normalizeIds(userTargetIds),
        ScheduleWriteCommandValidator.normalizeIds(teamTargetIds),
        ScheduleWriteCommandValidator.normalizeIds(projectTargetIds));
    command.validate();
    return command;
  }

  public ScheduleCreateCommand asCreateCommand(long creatorId) {
    return ScheduleCreateCommand.of(creatorId,title,type,visibility,startAt,endAt,allDay,colorLabel,
        content,location,creatorAttends,participantIds,userTargetIds,teamTargetIds,
        projectTargetIds);
  }

  private void validate() {
    ScheduleWriteCommandValidator.validate(1L,title,type,visibility,startAt,endAt,colorLabel,
        participantIds,userTargetIds,teamTargetIds,projectTargetIds,
        InvalidScheduleUpdateCommandException::new);
  }
}
