package com.flowbi.domain.room.service;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class ReservationAttendeeResolver {

  private final ReservationParticipantAccessService participantAccessService;

  ReservationAttendeeResolver(ReservationParticipantAccessService participantAccessService) {
    this.participantAccessService = participantAccessService;
  }

  List<Long> resolve(ReservationActor actor,List<Long> rawAttendeeIds,Boolean creatorAttends) {
    List<Long> normalizedAttendeeIds = normalize(rawAttendeeIds);
    return resolveNormalized(actor,normalizedAttendeeIds,creatorAttends);
  }

  List<Long> resolveNormalized(ReservationActor actor,List<Long> normalizedAttendeeIds,
      Boolean creatorAttends) {
    if (creatorAttends == null) {
      requireAttendees(normalizedAttendeeIds);
      validateAccess(actor,normalizedAttendeeIds);
      return normalizedAttendeeIds;
    }

    List<Long> selectedAttendeeIds = normalizedAttendeeIds.stream()
        .filter(attendeeId -> !attendeeId.equals(actor.userId())).toList();
    if (!creatorAttends) {
      requireAttendees(selectedAttendeeIds);
      validateAccess(actor,selectedAttendeeIds);
      return selectedAttendeeIds;
    }
    validateAccess(actor,selectedAttendeeIds);
    return java.util.stream.Stream
        .concat(java.util.stream.Stream.of(actor.userId()),selectedAttendeeIds.stream()).toList();
  }

  List<Long> normalize(List<Long> attendeeIds) {
    if (attendeeIds == null || attendeeIds.stream().anyMatch(id -> id == null || id < 1)) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
    return List.copyOf(new LinkedHashSet<>(attendeeIds));
  }

  private void requireAttendees(List<Long> attendeeIds) {
    if (attendeeIds.isEmpty()) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
  }

  private void validateAccess(ReservationActor actor,List<Long> attendeeIds) {
    if (attendeeIds.stream().anyMatch(id -> !participantAccessService.canAttend(actor,id))) {
      throw new RoomReservationApplicationException("RESERVATION_PARTICIPANT_FORBIDDEN");
    }
  }
}
