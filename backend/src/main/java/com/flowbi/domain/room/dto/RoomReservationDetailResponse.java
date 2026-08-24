package com.flowbi.domain.room.dto;

import java.time.LocalDateTime;
import java.util.List;

public record RoomReservationDetailResponse(Long reservationId, Long roomId, String title,
    LocalDateTime startAt, LocalDateTime endAt, boolean creatorAttends, List<Long> attendeeIds,
    List<Attendee> attendees, String description, boolean editable) {

  public RoomReservationDetailResponse(Long reservationId, Long roomId, String title,
      LocalDateTime startAt, LocalDateTime endAt, List<Long> attendeeIds, List<Attendee> attendees,
      String description, boolean editable) {
    this(reservationId, roomId, title, startAt, endAt, false, attendeeIds, attendees, description,
        editable);
  }

  public record Attendee(long userId, String displayName) {
  }
}
