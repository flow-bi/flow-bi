package com.flowbi.domain.schedule;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Safe empty default. A persistent adapter is deferred until schema review
 * approval.
 */
public final class InMemoryScheduleRepository implements ScheduleRepository {

  private final List<Schedule> schedules;

  public InMemoryScheduleRepository(List<Schedule> schedules) {
    this.schedules = new ArrayList<>(schedules);
  }

  @Override
  public List<Schedule> findActiveOverlapping(Instant from,Instant to) {
    return schedules.stream().filter(schedule -> !schedule.isCancelled())
        .filter(schedule -> schedule.overlaps(from,to))
        .sorted(Comparator.comparing(Schedule::getStartAt)).toList();
  }

  @Override
  public Optional<Schedule> findById(Long scheduleId) {
    return schedules.stream().filter(schedule -> schedule.getId().equals(scheduleId))
        .filter(schedule -> !schedule.isCancelled()).findFirst();
  }

  @Override
  public Optional<Schedule> findByIdIncludingCancelled(Long scheduleId) {
    return schedules.stream().filter(schedule -> schedule.getId().equals(scheduleId)).findFirst();
  }

  @Override
  public synchronized Schedule save(Schedule schedule) {
    long scheduleId = schedules.stream().map(Schedule::getId).max(Long::compareTo).orElse(0L) + 1;
    Schedule saved = new Schedule(scheduleId, schedule.getTitle(), schedule.getType(),
        schedule.getVisibility(), schedule.getColorLabel(), schedule.isAllDay(),
        schedule.getStartAt(), schedule.getEndAt(), schedule.getCreatorId(), schedule.getDetail(),
        schedule.getTargets(), schedule.getAttendees(), schedule.isCreatorAttending(),
        schedule.isCancelledByRoomReservation(), schedule.isRoomReservationLinked());
    schedules.add(saved);
    return saved;
  }

  @Override
  public synchronized Schedule update(Schedule schedule) {
    for (int index = 0; index < schedules.size(); index++) {
      if (schedules.get(index).getId().equals(schedule.getId())) {
        schedules.set(index,schedule);
        return schedule;
      }
    }
    throw new SchedulePersistenceException();
  }
}
