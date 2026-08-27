package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class RoomReservationRequestValidatorTest {

  private final RoomReservationRequestValidator validator = new RoomReservationRequestValidator();

  @Test
  void rejectsAnInvalidActorAndInvalidReservationTimeWithStableCodes() {
    assertCode(() -> validator.validateActor(null),"RESERVATION_ACTOR_REQUIRED");
    assertCode(() -> validator.validateCreate(1L,"Planning",LocalDateTime.of(2026,8,10,11,0),
        LocalDateTime.of(2026,8,10,10,0),"detail"),"ROOM_RESERVATION_INVALID");
  }

  @Test
  void rejectsMissingUpdateReservationIdentifierWithTheStableValidationCode() {
    assertCode(() -> validator.validateUpdate(null,1L,"Planning",LocalDateTime.of(2026,8,10,10,0),
        LocalDateTime.of(2026,8,10,11,0),"detail"),"ROOM_RESERVATION_INVALID");
  }

  private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action,
      String expectedCode) {
    assertThatThrownBy(action).isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo(expectedCode);
  }
}
