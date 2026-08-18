package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;

import com.flowbi.domain.schedule.port.ScheduleAudienceLookup;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleQueryService {

  private static final ZoneId DISPLAY_ZONE = ZoneId.of("Asia/Seoul");

  private final ScheduleRepository scheduleRepository;
  private final ScheduleAudienceLookup audienceLookup;
  private final ScheduleAccessPolicy accessPolicy = new ScheduleAccessPolicy();

  public ScheduleQueryService(ScheduleRepository scheduleRepository,
      ScheduleAudienceLookup audienceLookup) {
    this.scheduleRepository = scheduleRepository;
    this.audienceLookup = audienceLookup;
  }

  @Transactional(readOnly = true)
  public List<ScheduleListItem> query(ScheduleQuery query) {
    List<Schedule> schedules = scheduleRepository
        .findActiveOverlappingWithAssociations(query.from(),query.to());
    AudienceMembership membership = audienceMembership(query.actorId(),schedules);
    return schedules.stream().filter(schedule -> accessPolicy.isVisible(schedule,query.actorId(),
        membership.teamIds(),membership.projectIds())).map(this::toListItem).toList();
  }

  private AudienceMembership audienceMembership(long actorId,List<Schedule> schedules) {
    Set<Long> teamIds = targetIds(schedules,ScheduleTargetType.TEAM);
    Set<Long> projectIds = targetIds(schedules,ScheduleTargetType.PROJECT);
    return new AudienceMembership(audienceLookup.memberTeamIds(actorId,teamIds),
        audienceLookup.memberProjectIds(actorId,projectIds));
  }

  private Set<Long> targetIds(List<Schedule> schedules,ScheduleTargetType targetType) {
    return schedules.stream().flatMap(schedule -> schedule.getTargets().stream())
        .filter(target -> target.getType() == targetType)
        .map(target -> targetType == ScheduleTargetType.TEAM
            ? target.getTeamId()
            : target.getProjectId())
        .collect(Collectors.toUnmodifiableSet());
  }

  private ScheduleListItem toListItem(Schedule schedule) {
    return new ScheduleListItem(schedule.getId(), schedule.getTitle(),
        schedule.getStartAt().atZoneSameInstant(DISPLAY_ZONE).toOffsetDateTime(),
        schedule.getEndAt().atZoneSameInstant(DISPLAY_ZONE).toOffsetDateTime(), schedule.isAllDay(),
        schedule.getType(), schedule.getColorLabel());
  }

  private record AudienceMembership(Set<Long> teamIds, Set<Long> projectIds) {
  }
}
