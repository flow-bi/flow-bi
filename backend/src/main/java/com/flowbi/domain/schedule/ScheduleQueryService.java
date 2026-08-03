package com.flowbi.domain.schedule;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class ScheduleQueryService {

  private final ScheduleRepository scheduleRepository;
  private final ScheduleUserProvider userProvider;
  private final ScheduleAccessPolicy accessPolicy;

  public ScheduleQueryService(ScheduleRepository scheduleRepository,
      ScheduleUserProvider userProvider, ScheduleMembershipReader membershipReader) {
    this.scheduleRepository = scheduleRepository;
    this.userProvider = userProvider;
    this.accessPolicy = new ScheduleAccessPolicy(membershipReader);
  }

  public List<ScheduleListItemResponse> getSchedules(Instant from,Instant to) {
    Long userId = authenticatedUserId();
    validatePeriod(from,to);
    return findSchedules(userId,from,to);
  }

  public List<ScheduleListItemResponse> getSchedules(String from,String to) {
    Long userId = authenticatedUserId();
    Instant fromAt = Instant.parse(from);
    Instant toAt = Instant.parse(to);
    validatePeriod(fromAt,toAt);
    return findSchedules(userId,fromAt,toAt);
  }

  private List<ScheduleListItemResponse> findSchedules(Long userId,Instant from,Instant to) {
    return scheduleRepository.findActiveOverlapping(from,to).stream()
        .filter(schedule -> accessPolicy.canRead(userId,schedule)).map(this::toListItem).toList();
  }

  public ScheduleDetailResponse getSchedule(Long scheduleId) {
    Long userId = authenticatedUserId();
    Schedule schedule = scheduleRepository.findById(scheduleId)
        .filter(candidate -> accessPolicy.canRead(userId,candidate))
        .orElseThrow(ScheduleNotFoundException::new);
    return toDetail(schedule);
  }

  private Long authenticatedUserId() {
    return userProvider.currentUserId().orElseThrow(ScheduleAuthenticationRequiredException::new);
  }

  private void validatePeriod(Instant from,Instant to) {
    if (from == null || to == null) {
      throw new IllegalArgumentException("from and to are required");
    }
    if (!from.isBefore(to)) {
      throw new IllegalArgumentException("from must be before to");
    }
  }

  private ScheduleListItemResponse toListItem(Schedule schedule) {
    return new ScheduleListItemResponse(schedule.getId(), schedule.getTitle(), schedule.getType(),
        schedule.getColorLabel(), schedule.isAllDay(), schedule.getStartAt(), schedule.getEndAt());
  }

  private ScheduleDetailResponse toDetail(Schedule schedule) {
    return new ScheduleDetailResponse(schedule.getId(), schedule.getTitle(), schedule.getType(),
        schedule.getVisibility(), schedule.getColorLabel(), schedule.isAllDay(),
        schedule.getStartAt(), schedule.getEndAt(), schedule.getDetail().location(),
        schedule.getDetail().description(),
        schedule.getAttendees().stream()
            .map(attendee -> new ScheduleAttendeeResponse(attendee.userId())).toList(),
        schedule.getTargets(), schedule.isCreatorAttending(),
        schedule.getAttendees().size() + (schedule.isCreatorAttending() ? 1 : 0));
  }
}
