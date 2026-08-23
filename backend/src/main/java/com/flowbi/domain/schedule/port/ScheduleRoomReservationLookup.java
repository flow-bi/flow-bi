package com.flowbi.domain.schedule.port;

import java.util.Collection;
import java.util.Optional;
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

  /**
   * Returns the active reservation identifier only when the authenticated actor
   * owns the reservation's linked schedule.
   */
  default Optional<Long> findActiveReservationIdOwnedBy(long scheduleId,long actorId) {
    return Optional.empty();
  }
}
