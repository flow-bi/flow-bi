package com.flowbi.domain.room.service;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.springframework.stereotype.Component;

@Component
class RoomReservationRequestValidator {

  private static final LocalTime BUSINESS_START = LocalTime.of(9,0);
  private static final LocalTime BUSINESS_END = LocalTime.of(18,0);

  void validateActor(ReservationActor actor) {
    if (actor == null || actor.userId() == null || actor.userId() < 1) {
      throw new RoomReservationApplicationException("RESERVATION_ACTOR_REQUIRED");
    }
  }

  void validateCreate(Long roomId,String title,LocalDateTime startAt,LocalDateTime endAt,
      String description) {
    validateReservationDetails(roomId,title,startAt,endAt,description);
  }

  void validateUpdate(Long reservationId,Long roomId,String title,LocalDateTime startAt,
      LocalDateTime endAt,String description) {
    if (reservationId == null || reservationId < 1) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
    validateReservationDetails(roomId,title,startAt,endAt,description);
  }

  void validateCancellationReservationId(Long reservationId) {
    if (reservationId == null || reservationId < 1) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND");
    }
  }

  private void validateReservationDetails(Long roomId,String title,LocalDateTime startAt,
      LocalDateTime endAt,String description) {
    if (roomId == null || roomId < 1 || title == null || title.isBlank() || title.length() > 200
        || startAt == null || endAt == null || !startAt.toLocalDate().equals(endAt.toLocalDate())
        || !startAt.toLocalTime().isBefore(endAt.toLocalTime())
        || startAt.toLocalTime().isBefore(BUSINESS_START)
        || endAt.toLocalTime().isAfter(BUSINESS_END)
        || description != null && description.length() > 200) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
  }
}
