package com.flowbi.domain.room.dto;

import java.time.LocalDateTime;
import java.util.List;

public record UpdateRoomReservationCommand(Long reservationId, Long roomId, String title,
    LocalDateTime startAt, LocalDateTime endAt, List<Long> attendeeIds, Boolean creatorAttends,
    String description) {

  public UpdateRoomReservationCommand(Long reservationId, Long roomId, String title,
      LocalDateTime startAt, LocalDateTime endAt, List<Long> attendeeIds, String description) {
    this(reservationId, roomId, title, startAt, endAt, attendeeIds, null, description);
  }
}
