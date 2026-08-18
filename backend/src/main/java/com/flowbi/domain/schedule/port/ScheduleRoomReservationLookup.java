package com.flowbi.domain.schedule.port;

/**
 * Calendar boundary for determining whether a schedule is managed by a room
 * reservation.
 */
public interface ScheduleRoomReservationLookup {

  boolean isManagedSchedule(long scheduleId);
}
