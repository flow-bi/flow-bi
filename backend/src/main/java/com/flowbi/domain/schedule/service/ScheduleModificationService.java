package com.flowbi.domain.schedule.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ScheduleModificationService {

  Optional<ReservationSchedule> findReservationSchedule(Long scheduleId);

  void update(UpdateReservationScheduleCommand command);

  record ReservationSchedule(Long scheduleId, Long creatorId) {
  }

  record UpdateReservationScheduleCommand(Long scheduleId, String title, LocalDateTime startAt,
      LocalDateTime endAt, List<Long> attendeeIds, String description, String location) {
  }
}
