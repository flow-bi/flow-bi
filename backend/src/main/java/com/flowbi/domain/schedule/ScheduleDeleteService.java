package com.flowbi.domain.schedule;

import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleDeleteService {

  private final ScheduleRepository scheduleRepository;
  private final ScheduleUserProvider userProvider;
  private final ScheduleChangeAuditLogger auditLogger;
  private final Clock clock;

  @Autowired
  public ScheduleDeleteService(ScheduleRepository scheduleRepository,
      ScheduleUserProvider userProvider, ScheduleChangeAuditLogger auditLogger) {
    this(scheduleRepository, userProvider, auditLogger, Clock.systemUTC());
  }

  ScheduleDeleteService(ScheduleRepository scheduleRepository, ScheduleUserProvider userProvider,
      ScheduleChangeAuditLogger auditLogger, Clock clock) {
    this.scheduleRepository = scheduleRepository;
    this.userProvider = userProvider;
    this.auditLogger = auditLogger;
    this.clock = clock;
  }

  @Transactional
  public void delete(Long scheduleId) {
    Long actorId = userProvider.currentUserId()
        .orElseThrow(ScheduleAuthenticationRequiredException::new);
    Schedule schedule = scheduleRepository.findByIdIncludingCancelled(scheduleId)
        .filter(candidate -> candidate.getCreatorId().equals(actorId))
        .orElseThrow(ScheduleNotFoundException::new);
    if (schedule.isRoomReservationLinked()) {
      auditLogger.record(actorId,Instant.now(clock),Set.of(scheduleId),false);
      throw new ScheduleRoomReservationManagedException();
    }
    if (!schedule.isCancelled()) {
      scheduleRepository.update(schedule.cancelledBy(actorId,Instant.now(clock)));
    }
    auditLogger.record(actorId,Instant.now(clock),Set.of(scheduleId),true);
  }
}
