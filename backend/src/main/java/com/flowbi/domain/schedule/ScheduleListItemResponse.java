package com.flowbi.domain.schedule;

import java.time.Instant;

public record ScheduleListItemResponse(Long scheduleId, String title, ScheduleType type,
    ScheduleColorLabel colorLabel, boolean isAllDay, Instant startAt, Instant endAt) {
}
