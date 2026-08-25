package com.flowbi.domain.schedule.dto;

import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import com.flowbi.domain.schedule.entity.ScheduleColorLabel;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Function;

final class ScheduleWriteCommandValidator {

  private ScheduleWriteCommandValidator() {
  }

  static List<Long> normalizeIds(List<Long> values) {
    return Collections.unmodifiableList(new ArrayList<>(values == null ? List.of() : values));
  }

  static <T extends RuntimeException> void validate(long creatorId,String title,ScheduleType type,
      ScheduleVisibility visibility,OffsetDateTime startAt,OffsetDateTime endAt,
      ScheduleColorLabel colorLabel,List<Long> participantIds,List<Long> userTargetIds,
      List<Long> teamTargetIds,List<Long> projectTargetIds,Function<String, T> exceptionFactory) {
    if (creatorId <= 0 || title == null || title.isBlank() || title.length() > 200) {
      throw exceptionFactory.apply("creatorId and title must be valid");
    }
    if (type == null || visibility == null || colorLabel == null || startAt == null
        || endAt == null) {
      throw exceptionFactory.apply("required schedule values are missing");
    }
    if (!endAt.isAfter(startAt)) {
      throw exceptionFactory.apply("endAt must be after startAt");
    }
    if (visibility != ScheduleVisibility.defaultFor(type)) {
      throw exceptionFactory.apply("visibility must match the schedule type default");
    }
    validateIds(participantIds,"participantIds",true,exceptionFactory);
    validateIds(userTargetIds,"userTargetIds",false,exceptionFactory);
    validateIds(teamTargetIds,"teamTargetIds",false,exceptionFactory);
    validateIds(projectTargetIds,"projectTargetIds",false,exceptionFactory);
    switch (type) {
      case PERSONAL -> require(teamTargetIds.isEmpty() && projectTargetIds.isEmpty(),
          "personal target mismatch",exceptionFactory);
      case TEAM -> require(!teamTargetIds.isEmpty() && projectTargetIds.isEmpty(),
          "team target mismatch",exceptionFactory);
      case PROJECT -> require(!projectTargetIds.isEmpty() && teamTargetIds.isEmpty(),
          "project target mismatch",exceptionFactory);
    }
  }

  private static <T extends RuntimeException> void validateIds(List<Long> ids,String name,
      boolean rejectDuplicates,Function<String, T> exceptionFactory) {
    if (ids.stream().anyMatch(id -> id == null || id <= 0)) {
      throw exceptionFactory.apply(name + " must contain positive IDs");
    }
    if (rejectDuplicates && ids.stream().distinct().count() != ids.size()) {
      throw exceptionFactory.apply(name + " must not contain duplicates");
    }
  }

  private static <T extends RuntimeException> void require(boolean expression,String message,
      Function<String, T> exceptionFactory) {
    if (!expression) {
      throw exceptionFactory.apply(message);
    }
  }
}
