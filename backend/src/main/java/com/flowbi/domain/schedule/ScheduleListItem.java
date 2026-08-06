package com.flowbi.domain.schedule;

import java.time.OffsetDateTime;

public record ScheduleListItem(Long id, String title, OffsetDateTime startAt, OffsetDateTime endAt,
    boolean allDay, ScheduleType type, ScheduleColorLabel colorLabel) {
}
