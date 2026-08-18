package com.flowbi.domain.schedule.dto;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;
import com.flowbi.domain.schedule.service.*;

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
        endAt, allDay, colorLabel, content, location, creatorAttends, immutable(participantIds),
        immutable(userTargetIds), immutable(teamTargetIds), immutable(projectTargetIds));
    command.validate();
    return command;
  }

  public ScheduleCreateCommand asCreateCommand(long creatorId) {
    return ScheduleCreateCommand.of(creatorId,title,type,visibility,startAt,endAt,allDay,colorLabel,
        content,location,creatorAttends,participantIds,userTargetIds,teamTargetIds,
        projectTargetIds);
  }

  private static List<Long> immutable(List<Long> values) {
    return List.copyOf(values == null ? List.of() : values);
  }

  private void validate() {
    try {
      asCreateCommand(1L);
    } catch (InvalidScheduleCreateCommandException exception) {
      throw new InvalidScheduleUpdateCommandException(exception.getMessage());
    }
  }
}
