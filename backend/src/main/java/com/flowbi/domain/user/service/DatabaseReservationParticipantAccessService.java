package com.flowbi.domain.user.service;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.user.entity.UserStatus;
import com.flowbi.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class DatabaseReservationParticipantAccessService
    implements
      ReservationParticipantAccessService {

  private final UserRepository userRepository;

  public DatabaseReservationParticipantAccessService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public boolean canAttend(ReservationActor actor,Long attendeeId) {
    return actor != null && actor.userId() != null
        && userRepository.findById(actor.userId())
            .filter(user -> user.getStatus() == UserStatus.ACTIVE).isPresent()
        && userRepository.findById(attendeeId).filter(user -> user.getStatus() == UserStatus.ACTIVE)
            .isPresent();
  }
}
