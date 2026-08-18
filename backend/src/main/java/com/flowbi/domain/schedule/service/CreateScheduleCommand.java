package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.entity.ScheduleStatus;
import java.time.LocalDateTime;
import java.util.List;

public record CreateScheduleCommand(String title, LocalDateTime startAt, LocalDateTime endAt,
    Long creatorId, List<Long> attendeeIds, String description, String location,
    ScheduleStatus status) {
}
