package com.flowbi.domain.user.service;

import com.flowbi.domain.room.dto.ReservationActor;

public interface ReservationParticipantAccessService {

  boolean canAttend(ReservationActor actor,Long attendeeId);
}
