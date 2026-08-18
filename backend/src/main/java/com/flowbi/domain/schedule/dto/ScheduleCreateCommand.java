package com.flowbi.domain.schedule.dto;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;
import com.flowbi.domain.schedule.service.*;

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
        immutable(participantIds), immutable(userTargetIds), immutable(teamTargetIds),
        immutable(projectTargetIds));
    command.validate();
    return command;
  }

  private static List<Long> immutable(List<Long> values) {
    return List.copyOf(values == null ? List.of() : values);
  }

  private void validate() {
    if (creatorId <= 0 || title == null || title.isBlank() || title.length() > 200) {
      throw new InvalidScheduleCreateCommandException("creatorId and title must be valid");
    }
    if (type == null || visibility == null || colorLabel == null || startAt == null
        || endAt == null) {
      throw new InvalidScheduleCreateCommandException("required schedule values are missing");
    }
    if (!endAt.isAfter(startAt)) {
      throw new InvalidScheduleCreateCommandException("endAt must be after startAt");
    }
    if (visibility != ScheduleVisibility.defaultFor(type)) {
      throw new InvalidScheduleCreateCommandException(
          "visibility must match the schedule type default");
    }
    validateIds(participantIds,"participantIds",true);
    validateIds(userTargetIds,"userTargetIds",false);
    validateIds(teamTargetIds,"teamTargetIds",false);
    validateIds(projectTargetIds,"projectTargetIds",false);
    switch (type) {
      case PERSONAL ->
        require(teamTargetIds.isEmpty() && projectTargetIds.isEmpty(),"personal target mismatch");
      case TEAM ->
        require(!teamTargetIds.isEmpty() && projectTargetIds.isEmpty(),"team target mismatch");
      case PROJECT ->
        require(!projectTargetIds.isEmpty() && teamTargetIds.isEmpty(),"project target mismatch");
    }
  }

  private static void validateIds(List<Long> ids,String name,boolean rejectDuplicates) {
    if (ids.stream().anyMatch(id -> id == null || id <= 0)) {
      throw new InvalidScheduleCreateCommandException(name + " must contain positive IDs");
    }
    if (rejectDuplicates && ids.stream().distinct().count() != ids.size()) {
      throw new InvalidScheduleCreateCommandException(name + " must not contain duplicates");
    }
  }

  private static void require(boolean expression,String message) {
    if (!expression) {
      throw new InvalidScheduleCreateCommandException(message);
    }
  }
}
