package com.flowbi.domain.schedule;

import java.time.Instant;
import java.util.List;

public record ScheduleDetailResponse(Long scheduleId, String title, ScheduleType type,
    ScheduleVisibility visibility, ScheduleColorLabel colorLabel, boolean isAllDay, Instant startAt,
    Instant endAt, String location, String description, List<ScheduleAttendeeResponse> attendees,
    List<ScheduleTarget> targets, boolean creatorAttending, int attendeeCount) {
}
