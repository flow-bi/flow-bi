package com.flowbi.domain.schedule;

import com.flowbi.domain.schedule.port.ScheduleAudienceLookup;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import java.time.ZoneId;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleDetailService {

  private static final ZoneId DISPLAY_ZONE = ZoneId.of("Asia/Seoul");

  private final ScheduleRepository scheduleRepository;
  private final ScheduleAudienceLookup audienceLookup;
  private final ScheduleRoomReservationLookup roomReservationLookup;
  private final ScheduleAccessPolicy accessPolicy = new ScheduleAccessPolicy();

  public ScheduleDetailService(ScheduleRepository scheduleRepository,
      ScheduleAudienceLookup audienceLookup, ScheduleRoomReservationLookup roomReservationLookup) {
    this.scheduleRepository = scheduleRepository;
    this.audienceLookup = audienceLookup;
    this.roomReservationLookup = roomReservationLookup;
  }

  @Transactional(readOnly = true)
  public ScheduleDetailResponse find(long actorId,long scheduleId) {
    if (actorId <= 0 || scheduleId <= 0) {
      throw new ScheduleNotFoundException();
    }
    Schedule schedule = scheduleRepository.findActiveByIdWithAssociations(scheduleId)
        .orElseThrow(ScheduleNotFoundException::new);
    Set<Long> teamIds = targetIds(schedule,ScheduleTargetType.TEAM);
    Set<Long> projectIds = targetIds(schedule,ScheduleTargetType.PROJECT);
    if (!accessPolicy.isVisible(schedule,actorId,audienceLookup.memberTeamIds(actorId,teamIds),
        audienceLookup.memberProjectIds(actorId,projectIds))) {
      throw new ScheduleNotFoundException();
    }
    boolean meetingRoomManaged = roomReservationLookup.isManagedSchedule(scheduleId);
    return new ScheduleDetailResponse(schedule.getId(), schedule.getTitle(),
        schedule.getStartAt().atZoneSameInstant(DISPLAY_ZONE).toOffsetDateTime(),
        schedule.getEndAt().atZoneSameInstant(DISPLAY_ZONE).toOffsetDateTime(), schedule.isAllDay(),
        schedule.getType(), schedule.getVisibility(), schedule.getColorLabel(),
        schedule.getDetail().getContent(), schedule.getDetail().getLocation(),
        schedule.isCreatorAttends(),
        schedule.getParticipants().stream().map(ScheduleParticipant::getUserId).toList(),
        targetIds(schedule,ScheduleTargetType.USER).stream().toList(), teamIds.stream().toList(),
        projectIds.stream().toList(), meetingRoomManaged,
        schedule.getCreatorId() == actorId && !meetingRoomManaged);
  }

  private Set<Long> targetIds(Schedule schedule,ScheduleTargetType targetType) {
    return schedule.getTargets().stream().filter(target -> target.getType() == targetType)
        .map(target -> switch (targetType) {
          case USER -> target.getUserId();
          case TEAM -> target.getTeamId();
          case PROJECT -> target.getProjectId();
        }).collect(Collectors.toUnmodifiableSet());
  }
}
