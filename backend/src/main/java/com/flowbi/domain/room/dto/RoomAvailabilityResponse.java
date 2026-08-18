package com.flowbi.domain.room.dto;

import java.time.LocalDateTime;
import java.util.List;

public record RoomAvailabilityResponse(List<RoomSummary> rooms) {

  public record RoomSummary(Long id, String name, Long capacity, String location,
      boolean usesDefaultImage, List<ReservationSummary> reservations) {
  }

  public record ReservationSummary(Long id, String title, LocalDateTime startAt,
      LocalDateTime endAt, ReservationDisplayStatus displayStatus, boolean canEdit) {
  }
}
