package com.flowbi.domain.schedule.service;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface ScheduleModificationService {

  Optional<ReservationSchedule> findReservationSchedule(Long scheduleId);

  Optional<ReservationSchedule> findReservationScheduleForCancellation(Long scheduleId);

  Optional<ReservationScheduleDetails> findReservationScheduleDetails(Long scheduleId);

  void update(UpdateReservationScheduleCommand command);

  void cancelReservationSchedule(Long scheduleId,long actorId,OffsetDateTime cancelledAt);

  record ReservationSchedule(Long scheduleId, Long creatorId) {
  }

  record ReservationScheduleDetails(Long creatorId, String description, List<Long> attendeeIds) {
  }

  record UpdateReservationScheduleCommand(Long scheduleId, String title, LocalDateTime startAt,
      LocalDateTime endAt, List<Long> attendeeIds, String description, String location) {
  }
}
