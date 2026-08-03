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
public class ScheduleCreateService {

  private final ScheduleRepository scheduleRepository;
  private final ScheduleUserProvider userProvider;
  private final ScheduleMembershipReader membershipReader;
  private final ScheduleActiveUserReader activeUserReader;
  private final ScheduleCreationAuditLogger auditLogger;
  private final Clock clock;

  @Autowired
  public ScheduleCreateService(ScheduleRepository scheduleRepository,
      ScheduleUserProvider userProvider, ScheduleMembershipReader membershipReader,
      ScheduleActiveUserReader activeUserReader, ScheduleCreationAuditLogger auditLogger) {
    this(scheduleRepository, userProvider, membershipReader, activeUserReader, auditLogger,
        Clock.systemUTC());
  }

  ScheduleCreateService(ScheduleRepository scheduleRepository, ScheduleUserProvider userProvider,
      ScheduleMembershipReader membershipReader, ScheduleActiveUserReader activeUserReader,
      ScheduleCreationAuditLogger auditLogger, Clock clock) {
    this.scheduleRepository = scheduleRepository;
    this.userProvider = userProvider;
    this.membershipReader = membershipReader;
    this.activeUserReader = activeUserReader;
    this.auditLogger = auditLogger;
    this.clock = clock;
  }

  @Transactional
  public ScheduleDetailResponse create(ScheduleCreateRequest request) {
    Long creatorId = userProvider.currentUserId()
        .orElseThrow(ScheduleAuthenticationRequiredException::new);
    try {
      validate(request,creatorId);
      List<ScheduleAttendee> attendees = attendees(request.attendeeIds(),creatorId);
      Schedule saved = scheduleRepository.save(new Schedule(0L, request.title().trim(),
          request.type(), defaultVisibility(request.type()), request.colorLabel(), request.allDay(),
          request.startAt(), request.endAt(), creatorId,
          new ScheduleDetail(request.location(), request.description()),
          List.copyOf(request.targets()), attendees, request.creatorAttending(), false));
      auditLogger.record(creatorId,Instant.now(clock),targetIds(request.targets()),true);
      return toDetail(saved);
    } catch (ScheduleAuthenticationRequiredException exception) {
      throw exception;
    } catch (RuntimeException exception) {
      auditLogger.record(creatorId,Instant.now(clock),safeTargetIds(request),false);
      throw exception;
    }
  }

  private void validate(ScheduleCreateRequest request,Long creatorId) {
    if (request == null || blank(request.title()) || blank(request.location())
        || blank(request.description()) || request.type() == null || request.colorLabel() == null
        || request.startAt() == null || request.endAt() == null
        || !request.startAt().isBefore(request.endAt()) || request.targets() == null
        || request.targets().stream().anyMatch(Objects::isNull) || request.attendeeIds() == null) {
      throw new ScheduleValidationException();
    }
    if (request.visibility() != null && request.visibility() != defaultVisibility(request.type())) {
      throw new ScheduleValidationException();
    }
    validateTargets(request.type(),request.targets(),creatorId);
    if (request.attendeeIds().stream().anyMatch(Objects::isNull)
        || request.attendeeIds().stream().filter(userId -> !userId.equals(creatorId))
            .anyMatch(userId -> !activeUserReader.isAccessibleActiveUser(userId))) {
      throw new ScheduleValidationException();
    }
  }

  private void validateTargets(ScheduleType type,List<ScheduleTarget> targets,Long creatorId) {
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
            || !membershipReader.canAccessAllTeams(creatorId,targetIds)) {
          throw new ScheduleValidationException();
        }
      }
      case PROJECT -> {
        if (targetIds.isEmpty()
            || targets.stream().anyMatch(target -> target.type() != ScheduleTargetType.PROJECT)
            || !membershipReader.canAccessAllProjects(creatorId,targetIds)) {
          throw new ScheduleValidationException();
        }
      }
    }
  }

  private List<ScheduleAttendee> attendees(List<Long> attendeeIds,Long creatorId) {
    return attendeeIds.stream().filter(userId -> !userId.equals(creatorId))
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

  private Set<Long> safeTargetIds(ScheduleCreateRequest request) {
    return request == null || request.targets() == null
        ? Set.of()
        : request.targets().stream().filter(Objects::nonNull).map(ScheduleTarget::targetId)
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
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
