package com.flowbi.domain.room.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record RoomAvailabilityQuery(LocalDate date, LocalTime startTime, LocalTime endTime,
    Integer minimumCapacity, ReservationDisplayStatus preferredReservationStatus) {

  public static RoomAvailabilityQuery forDate(LocalDate date) {
    return new RoomAvailabilityQuery(date, null, null, null, null);
  }
}
