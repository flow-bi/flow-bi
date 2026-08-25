package com.flowbi.domain.schedule.dto;

import com.flowbi.domain.schedule.entity.ScheduleColorLabel;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import java.time.OffsetDateTime;
import java.util.List;

public record ScheduleDetailResponse(Long id, String title, OffsetDateTime startAt,
    OffsetDateTime endAt, boolean allDay, ScheduleType type, ScheduleVisibility visibility,
    ScheduleColorLabel colorLabel, String content, String location, boolean creatorAttends,
    List<Long> participantIds, List<AttendeeCandidate> participants, int attendeeCount,
    List<Long> userTargetIds, List<Long> teamTargetIds, List<Long> projectTargetIds,
    boolean meetingRoomManaged, boolean canManage, Long roomReservationId,
    boolean canCancelRoomReservation) {
}
