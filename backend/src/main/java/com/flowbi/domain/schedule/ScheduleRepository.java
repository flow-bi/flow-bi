package com.flowbi.domain.schedule;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository {
  List<Schedule> findActiveOverlapping(Instant from,Instant to);
  Optional<Schedule> findById(Long scheduleId);
  Optional<Schedule> findByIdIncludingCancelled(Long scheduleId);
  Schedule save(Schedule schedule);
  Schedule update(Schedule schedule);
}
