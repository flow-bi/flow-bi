package com.flowbi.domain.room.dto;

import java.time.LocalDateTime;
import java.util.List;

public record CreateRoomReservationCommand(Long roomId, String title, LocalDateTime startAt,
    LocalDateTime endAt, List<Long> attendeeIds, Boolean creatorAttends, String description) {

  public CreateRoomReservationCommand(Long roomId, String title, LocalDateTime startAt,
      LocalDateTime endAt, List<Long> attendeeIds, String description) {
    this(roomId, title, startAt, endAt, attendeeIds, null, description);
  }
}
