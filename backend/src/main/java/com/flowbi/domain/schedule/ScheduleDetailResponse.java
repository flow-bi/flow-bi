package com.flowbi.domain.schedule;

import java.time.OffsetDateTime;
import java.util.List;

public record ScheduleDetailResponse(Long id, String title, OffsetDateTime startAt,
    OffsetDateTime endAt, boolean allDay, ScheduleType type, ScheduleVisibility visibility,
    ScheduleColorLabel colorLabel, String content, String location, boolean creatorAttends,
    List<Long> participantIds, List<Long> userTargetIds, List<Long> teamTargetIds,
    List<Long> projectTargetIds, boolean meetingRoomManaged, boolean canManage) {
}
