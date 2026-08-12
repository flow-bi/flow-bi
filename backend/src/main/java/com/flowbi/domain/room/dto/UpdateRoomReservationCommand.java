package com.flowbi.domain.room.dto;

import java.time.LocalDateTime;
import java.util.List;

public record UpdateRoomReservationCommand(Long reservationId, Long roomId, String title,
    LocalDateTime startAt, LocalDateTime endAt, List<Long> attendeeIds, String description) {
}
