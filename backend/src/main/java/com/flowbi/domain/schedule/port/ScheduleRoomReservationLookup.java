package com.flowbi.domain.schedule.port;

import java.util.Collection;
import java.util.Set;

/**
 * Calendar boundary for determining whether a schedule is managed by a room
 * reservation.
 */
public interface ScheduleRoomReservationLookup {

  boolean isManagedSchedule(long scheduleId);

  default Set<Long> managedScheduleIds(Collection<Long> scheduleIds) {
    return Set.of();
  }
}
