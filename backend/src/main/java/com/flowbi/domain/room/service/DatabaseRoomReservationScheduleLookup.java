package com.flowbi.domain.room.service;

import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import java.util.Collection;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class DatabaseRoomReservationScheduleLookup implements ScheduleRoomReservationLookup {

  private final RoomReservationRepository reservationRepository;

  public DatabaseRoomReservationScheduleLookup(RoomReservationRepository reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  @Override
  public boolean isManagedSchedule(long scheduleId) {
    return scheduleId > 0 && reservationRepository.existsByScheduleId(scheduleId);
  }

  @Override
  public Set<Long> managedScheduleIds(Collection<Long> scheduleIds) {
    if (scheduleIds.isEmpty()) {
      return Set.of();
    }
    return Set.copyOf(reservationRepository.findScheduleIdsIn(scheduleIds));
  }
}
