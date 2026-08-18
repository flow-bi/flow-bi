package com.flowbi.domain.room.service;

import com.flowbi.domain.schedule.dto.ScheduleCreateCommand;
import com.flowbi.domain.schedule.dto.ScheduleUpdateCommand;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleColorLabel;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

final class RoomReservationScheduleFixture {

  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

  private RoomReservationScheduleFixture() {
  }

  static Schedule schedule(String title,LocalDateTime startAt,LocalDateTime endAt,long creatorId,
      List<Long> attendeeIds,String description,String location) {
    return Schedule.create(ScheduleCreateCommand.of(creatorId,title,ScheduleType.PERSONAL,
        ScheduleVisibility.PRIVATE,startAt.atZone(KOREA_ZONE).toOffsetDateTime(),
        endAt.atZone(KOREA_ZONE).toOffsetDateTime(),false,ScheduleColorLabel.BLUE,description,
        location,attendeeIds.contains(creatorId),participants(attendeeIds,creatorId),List.of(),
        List.of(),List.of()));
  }

  static ScheduleUpdateCommand update(String title,LocalDateTime startAt,LocalDateTime endAt,
      long creatorId,List<Long> attendeeIds,String description,String location) {
    return ScheduleUpdateCommand.of(title,ScheduleType.PERSONAL,ScheduleVisibility.PRIVATE,
        startAt.atZone(KOREA_ZONE).toOffsetDateTime(),endAt.atZone(KOREA_ZONE).toOffsetDateTime(),
        false,ScheduleColorLabel.BLUE,description,location,attendeeIds.contains(creatorId),
        participants(attendeeIds,creatorId),List.of(),List.of(),List.of());
  }

  private static List<Long> participants(List<Long> attendeeIds,long creatorId) {
    return attendeeIds.stream().filter(attendeeId -> attendeeId != creatorId).toList();
  }
}
