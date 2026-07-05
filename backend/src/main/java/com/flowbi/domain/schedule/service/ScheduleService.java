package com.flowbi.domain.schedule.service;

import com.flowbi.common.exception.BusinessException;
import com.flowbi.common.exception.ErrorCode;
import com.flowbi.domain.schedule.dto.ScheduleRequest;
import com.flowbi.domain.schedule.dto.ScheduleResponse;
import com.flowbi.domain.schedule.dto.ScheduleTargetRequest;
import com.flowbi.domain.schedule.dto.ScheduleTargetResponse;
import com.flowbi.domain.schedule.dto.ScheduleView;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleDetail;
import com.flowbi.domain.schedule.entity.ScheduleTarget;
import com.flowbi.domain.schedule.entity.ScheduleTargetType;
import com.flowbi.domain.schedule.repository.ScheduleDetailRepository;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.repository.ScheduleTargetRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ScheduleService implements ScheduleAutomationService {

  private final ScheduleRepository scheduleRepository;
  private final ScheduleDetailRepository detailRepository;
  private final ScheduleTargetRepository targetRepository;

  public ScheduleService(ScheduleRepository scheduleRepository,
      ScheduleDetailRepository detailRepository, ScheduleTargetRepository targetRepository) {
    this.scheduleRepository = scheduleRepository;
    this.detailRepository = detailRepository;
    this.targetRepository = targetRepository;
  }

  @Transactional(readOnly = true)
  public List<ScheduleResponse> findCalendar(Long userId,ScheduleView view,LocalDate date) {
    DateRange range = DateRange.from(view,date);
    return scheduleRepository.findCalendarSchedules(userId,range.start(),range.end()).stream()
        .map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public ScheduleResponse findById(Long userId,Long scheduleId) {
    Schedule schedule = getSchedule(scheduleId);
    if (!isReadable(userId,scheduleId,schedule)) {
      throw new BusinessException(ErrorCode.SCHEDULE_ACCESS_DENIED);
    }
    return toResponse(schedule);
  }

  public ScheduleResponse create(Long creatorId,ScheduleRequest request) {
    validateRequest(request);
    Schedule schedule = scheduleRepository
        .save(new Schedule(request.title(), request.scheduleType(), request.visibility(),
            request.startAt(), request.endAt(), creatorId, request.colorLabel()));
    detailRepository
        .save(new ScheduleDetail(schedule.getScheduleId(), request.content(), request.location()));
    saveTargets(schedule.getScheduleId(),request.targets());
    return toResponse(schedule);
  }

  public ScheduleResponse update(Long userId,Long scheduleId,ScheduleRequest request) {
    validateRequest(request);
    Schedule schedule = getSchedule(scheduleId);
    verifyCreator(userId,schedule);
    schedule.update(request.title(),request.scheduleType(),request.visibility(),request.startAt(),
        request.endAt(),request.colorLabel());
    ScheduleDetail detail = detailRepository.findByScheduleId(scheduleId)
        .orElseGet(() -> detailRepository.save(new ScheduleDetail(scheduleId, null, null)));
    detail.update(request.content(),request.location());
    targetRepository.deleteByScheduleId(scheduleId);
    saveTargets(scheduleId,request.targets());
    return toResponse(schedule);
  }

  public void delete(Long userId,Long scheduleId) {
    Schedule schedule = getSchedule(scheduleId);
    verifyCreator(userId,schedule);
    targetRepository.deleteByScheduleId(scheduleId);
    detailRepository.deleteByScheduleId(scheduleId);
    scheduleRepository.delete(schedule);
  }

  @Override
  public ScheduleResponse createForMeetingRoom(Long creatorId,ScheduleRequest request) {
    return create(creatorId,request);
  }

  @Override
  public void deleteForMeetingRoom(Long creatorId,Long scheduleId) {
    delete(creatorId,scheduleId);
  }

  private Schedule getSchedule(Long scheduleId) {
    return scheduleRepository.findById(scheduleId)
        .orElseThrow(() -> new BusinessException(ErrorCode.SCHEDULE_NOT_FOUND));
  }

  private boolean isReadable(Long userId,Long scheduleId,Schedule schedule) {
    if (schedule.getCreatorId().equals(userId)) {
      return true;
    }
    return scheduleRepository
        .findCalendarSchedules(userId,schedule.getStartAt(),schedule.getEndAt().plusNanos(1))
        .stream().anyMatch(readable -> readable.getScheduleId().equals(scheduleId));
  }

  private void verifyCreator(Long userId,Schedule schedule) {
    if (!schedule.getCreatorId().equals(userId)) {
      throw new BusinessException(ErrorCode.SCHEDULE_ACCESS_DENIED);
    }
  }

  private void validateRequest(ScheduleRequest request) {
    if (!request.startAt().isBefore(request.endAt())) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, "종료 일시는 시작 일시보다 이후여야 합니다.");
    }
    if (request.targets() != null) {
      request.targets().forEach(this::validateTarget);
    }
  }

  private void validateTarget(ScheduleTargetRequest target) {
    boolean valid = switch (target.targetType()) {
      case USER -> target.userId() != null && target.projectId() == null && target.teamId() == null
          && target.ancestorTeamId() == null;
      case PROJECT -> target.projectId() != null && target.userId() == null
          && target.teamId() == null && target.ancestorTeamId() == null;
      case TEAM -> target.teamId() != null && target.userId() == null && target.projectId() == null;
    };
    if (!valid) {
      throw new BusinessException(ErrorCode.SCHEDULE_INVALID_TARGET);
    }
  }

  private void saveTargets(Long scheduleId,List<ScheduleTargetRequest> targets) {
    if (targets == null || targets.isEmpty()) {
      return;
    }
    List<ScheduleTarget> entities = targets.stream()
        .map(target -> new ScheduleTarget(scheduleId, target.userId(), target.projectId(),
            target.ancestorTeamId() == null && target.targetType() == ScheduleTargetType.TEAM
                ? target.teamId()
                : target.ancestorTeamId(),
            target.teamId(), target.targetType()))
        .toList();
    targetRepository.saveAll(entities);
  }

  private ScheduleResponse toResponse(Schedule schedule) {
    ScheduleDetail detail = detailRepository.findByScheduleId(schedule.getScheduleId())
        .orElse(null);
    List<ScheduleTargetResponse> targets = targetRepository
        .findByScheduleId(schedule.getScheduleId()).stream()
        .map(target -> new ScheduleTargetResponse(target.getTargetType(), target.getUserId(),
            target.getProjectId(), target.getAncestorTeamId(), target.getTeamId()))
        .toList();
    return new ScheduleResponse(schedule.getScheduleId(), schedule.getTitle(),
        schedule.getScheduleType(), schedule.getVisibility(), schedule.getStartAt(),
        schedule.getEndAt(), schedule.getCreatorId(), schedule.getColorLabel(),
        detail == null ? null : detail.getLocation(), detail == null ? null : detail.getContent(),
        targets);
  }

  private record DateRange(LocalDateTime start, LocalDateTime end) {

    static DateRange from(ScheduleView view,LocalDate date) {
      return switch (view) {
        case MONTH -> {
          YearMonth month = YearMonth.from(date);
          yield new DateRange(month.atDay(1).atStartOfDay(),
              month.plusMonths(1).atDay(1).atStartOfDay());
        }
        case WEEK -> {
          LocalDate monday = date.with(DayOfWeek.MONDAY);
          yield new DateRange(monday.atStartOfDay(), monday.plusDays(7).atStartOfDay());
        }
        case DAY -> new DateRange(date.atStartOfDay(), date.plusDays(1).atStartOfDay());
      };
    }
  }
}
