package com.flowbi.domain.schedule;

import java.time.Instant;
import java.util.List;

public record ScheduleUpdateRequest(String title, ScheduleType type, ScheduleVisibility visibility,
    ScheduleColorLabel colorLabel, boolean allDay, Instant startAt, Instant endAt, String location,
    String description, List<ScheduleTarget> targets, List<Long> attendeeIds,
    boolean creatorAttending) {
}
