package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;

import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ScheduleCancelTransaction {

  private final ScheduleRepository scheduleRepository;
  private final ScheduleRoomReservationLookup roomReservationLookup;

  ScheduleCancelTransaction(ScheduleRepository scheduleRepository,
      ScheduleRoomReservationLookup roomReservationLookup) {
    this.scheduleRepository = scheduleRepository;
    this.roomReservationLookup = roomReservationLookup;
  }

  @Transactional
  public ScheduleAuditResult cancel(long actorId,long scheduleId,OffsetDateTime cancelledAt) {
    if (actorId <= 0 || scheduleId <= 0) {
      throw new ScheduleNotFoundException();
    }
    Schedule schedule = scheduleRepository.findByIdForUpdate(scheduleId)
        .orElseThrow(ScheduleNotFoundException::new);
    if (schedule.getCreatorId() != actorId) {
      throw new ScheduleNotFoundException();
    }
    if (roomReservationLookup.isManagedSchedule(scheduleId)) {
      throw new RoomReservationManagedScheduleException();
    }
    if (schedule.getStatus() == ScheduleStatus.CANCELED) {
      return ScheduleAuditResult.ALREADY_CANCELED;
    }
    schedule.cancel(actorId,cancelledAt);
    return ScheduleAuditResult.CANCELED;
  }
}
