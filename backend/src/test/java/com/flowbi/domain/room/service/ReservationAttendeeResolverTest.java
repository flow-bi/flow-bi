package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ReservationAttendeeResolverTest {

  private static final ReservationActor ACTOR = new ReservationActor(10L);

  @Mock
  private ReservationParticipantAccessService participantAccessService;

  @Test
  void deduplicatesAttendeesAndAddsTheCreatorOnlyWhenRequested() {
    ReservationAttendeeResolver resolver = new ReservationAttendeeResolver(
        participantAccessService);
    when(participantAccessService.canAttend(ACTOR,11L)).thenReturn(true);

    assertThat(resolver.resolve(ACTOR,List.of(11L,11L,10L),true)).containsExactly(10L,11L);
  }

  @Test
  void usesAlreadyNormalizedAttendeesWithoutRepeatingNormalization() {
    ReservationAttendeeResolver resolver = new ReservationAttendeeResolver(
        participantAccessService);
    when(participantAccessService.canAttend(ACTOR,11L)).thenReturn(true);

    assertThat(resolver.resolveNormalized(ACTOR,List.of(11L),false)).containsExactly(11L);
  }

  @Test
  void rejectsEmptyRequiredAttendeesAndForbiddenParticipants() {
    ReservationAttendeeResolver resolver = new ReservationAttendeeResolver(
        participantAccessService);

    assertCode(() -> resolver.resolve(ACTOR,List.of(),false),"ROOM_RESERVATION_INVALID");
    when(participantAccessService.canAttend(ACTOR,11L)).thenReturn(false);
    assertCode(() -> resolver.resolve(ACTOR,List.of(11L),false),
        "RESERVATION_PARTICIPANT_FORBIDDEN");
  }

  private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action,
      String expectedCode) {
    assertThatThrownBy(action).isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo(expectedCode);
  }
}
