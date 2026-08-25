package com.flowbi.domain.schedule.dto;

import com.flowbi.domain.schedule.entity.ScheduleColorLabel;
import com.flowbi.domain.schedule.entity.ScheduleType;
import java.time.OffsetDateTime;

public record ScheduleListItem(Long id, String title, OffsetDateTime startAt, OffsetDateTime endAt,
    boolean allDay, ScheduleType type, ScheduleColorLabel colorLabel) {
}
