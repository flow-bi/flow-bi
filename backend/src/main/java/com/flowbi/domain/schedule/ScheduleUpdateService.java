package com.flowbi.domain.schedule;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleUpdateService {

  private final ScheduleRepository scheduleRepository;
  private final ScheduleUserProvider userProvider;
  private final ScheduleMembershipReader membershipReader;
  private final ScheduleActiveUserReader activeUserReader;
  private final ScheduleChangeAuditLogger auditLogger;
  private final Clock clock;

  @Autowired
  public ScheduleUpdateService(ScheduleRepository scheduleRepository,
      ScheduleUserProvider userProvider, ScheduleMembershipReader membershipReader,
      ScheduleActiveUserReader activeUserReader, ScheduleChangeAuditLogger auditLogger) {
    this(scheduleRepository, userProvider, membershipReader, activeUserReader, auditLogger,
        Clock.systemUTC());
  }

  ScheduleUpdateService(ScheduleRepository scheduleRepository, ScheduleUserProvider userProvider,
      ScheduleMembershipReader membershipReader, ScheduleActiveUserReader activeUserReader,
      ScheduleChangeAuditLogger auditLogger, Clock clock) {
    this.scheduleRepository = scheduleRepository;
    this.userProvider = userProvider;
    this.membershipReader = membershipReader;
    this.activeUserReader = activeUserReader;
    this.auditLogger = auditLogger;
    this.clock = clock;
  }

  @Transactional
  public ScheduleDetailResponse update(Long scheduleId,ScheduleUpdateRequest request) {
    Long actorId = userProvider.currentUserId()
        .orElseThrow(ScheduleAuthenticationRequiredException::new);
    Schedule current = ownedSchedule(scheduleId,actorId);
    if (current.isRoomReservationLinked()) {
      auditLogger.record(actorId,Instant.now(clock),Set.of(),false);
      throw new ScheduleRoomReservationManagedException();
    }
    try {
      validate(request,actorId);
      List<ScheduleAttendee> attendees = attendees(request.attendeeIds(),actorId);
      Schedule updated = scheduleRepository.update(new Schedule(current.getId(),
          request.title().trim(), request.type(), defaultVisibility(request.type()),
          request.colorLabel(), request.allDay(), request.startAt(), request.endAt(),
          current.getCreatorId(), new ScheduleDetail(request.location(), request.description()),
          List.copyOf(request.targets()), attendees, request.creatorAttending(), false));
      auditLogger.record(actorId,Instant.now(clock),targetIds(request.targets()),true);
      return toDetail(updated);
    } catch (RuntimeException exception) {
      auditLogger.record(actorId,Instant.now(clock),safeTargetIds(request),false);
      throw exception;
    }
  }

  private Schedule ownedSchedule(Long scheduleId,Long actorId) {
    return scheduleRepository.findById(scheduleId)
        .filter(schedule -> schedule.getCreatorId().equals(actorId))
        .orElseThrow(ScheduleNotFoundException::new);
  }

  private void validate(ScheduleUpdateRequest request,Long actorId) {
    if (request == null || blank(request.title()) || blank(request.location())
        || blank(request.description()) || request.type() == null || request.colorLabel() == null
        || request.startAt() == null || request.endAt() == null
        || !request.startAt().isBefore(request.endAt()) || request.targets() == null
        || request.attendeeIds() == null || request.visibility() != null
            && request.visibility() != defaultVisibility(request.type())) {
      throw new ScheduleValidationException();
    }
    validateTargets(request.type(),request.targets(),actorId);
    if (request.attendeeIds().stream().anyMatch(Objects::isNull)
        || request.attendeeIds().stream().filter(userId -> !userId.equals(actorId))
            .anyMatch(userId -> !activeUserReader.isAccessibleActiveUser(userId))) {
      throw new ScheduleValidationException();
    }
  }

  private void validateTargets(ScheduleType type,List<ScheduleTarget> targets,Long actorId) {
    Set<Long> targetIds = targetIds(targets);
    switch (type) {
      case PERSONAL -> {
        if (targets.stream().anyMatch(target -> target.type() != ScheduleTargetType.USER)) {
          throw new ScheduleValidationException();
        }
      }
      case TEAM -> {
        if (targetIds.isEmpty()
            || targets.stream().anyMatch(target -> target.type() != ScheduleTargetType.TEAM)
            || !membershipReader.canAccessAllTeams(actorId,targetIds)) {
          throw new ScheduleValidationException();
        }
      }
      case PROJECT -> {
        if (targetIds.isEmpty()
            || targets.stream().anyMatch(target -> target.type() != ScheduleTargetType.PROJECT)
            || !membershipReader.canAccessAllProjects(actorId,targetIds)) {
          throw new ScheduleValidationException();
        }
      }
    }
  }

  private List<ScheduleAttendee> attendees(List<Long> attendeeIds,Long actorId) {
    return attendeeIds.stream().filter(userId -> !userId.equals(actorId))
        .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new)).stream()
        .map(ScheduleAttendee::new).toList();
  }

  private ScheduleVisibility defaultVisibility(ScheduleType type) {
    return switch (type) {
      case PERSONAL -> ScheduleVisibility.PRIVATE;
      case TEAM -> ScheduleVisibility.TEAM;
      case PROJECT -> ScheduleVisibility.PROJECT;
    };
  }

  private Set<Long> targetIds(List<ScheduleTarget> targets) {
    return targets.stream().map(ScheduleTarget::targetId)
        .collect(java.util.stream.Collectors.toUnmodifiableSet());
  }

  private Set<Long> safeTargetIds(ScheduleUpdateRequest request) {
    return request == null || request.targets() == null ? Set.of() : targetIds(request.targets());
  }

  private boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private ScheduleDetailResponse toDetail(Schedule schedule) {
    List<ScheduleAttendeeResponse> attendees = schedule.getAttendees().stream()
        .map(attendee -> new ScheduleAttendeeResponse(attendee.userId())).toList();
    return new ScheduleDetailResponse(schedule.getId(), schedule.getTitle(), schedule.getType(),
        schedule.getVisibility(), schedule.getColorLabel(), schedule.isAllDay(),
        schedule.getStartAt(), schedule.getEndAt(), schedule.getDetail().location(),
        schedule.getDetail().description(), attendees, schedule.getTargets(),
        schedule.isCreatorAttending(), attendees.size() + (schedule.isCreatorAttending() ? 1 : 0));
  }
}
