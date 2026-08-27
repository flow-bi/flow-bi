package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;

import com.flowbi.domain.schedule.port.ScheduleReferenceValidator;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ScheduleUpdateTransaction {

  private final ScheduleRepository scheduleRepository;
  private final ScheduleRoomReservationLookup roomReservationLookup;

  ScheduleUpdateTransaction(ScheduleRepository scheduleRepository,
      ScheduleRoomReservationLookup roomReservationLookup) {
    this.scheduleRepository = scheduleRepository;
    this.roomReservationLookup = roomReservationLookup;
  }

  @Transactional
  public Schedule update(long actorId,long scheduleId,ScheduleUpdateCommand command,
      ScheduleReferenceValidator referenceValidator) {
    Schedule schedule = findCreatorScheduleForUpdate(actorId,scheduleId);
    if (roomReservationLookup.isManagedSchedule(scheduleId)) {
      throw new RoomReservationManagedScheduleException();
    }
    if (schedule.getStatus() != ScheduleStatus.ACTIVE) {
      throw new ScheduleNotFoundException();
    }
    schedule = scheduleRepository.findByIdWithAssociations(scheduleId)
        .orElseThrow(ScheduleNotFoundException::new);
    PersonalScheduleRelationValidator.reject(command.type(),command.participantIds(),
        command.userTargetIds(),command.teamTargetIds(),command.projectTargetIds());
    referenceValidator.validateForUpdate(schedule.getCreatorId(),command);
    schedule.update(command);
    return schedule;
  }

  private Schedule findCreatorScheduleForUpdate(long actorId,long scheduleId) {
    if (actorId <= 0 || scheduleId <= 0) {
      throw new ScheduleNotFoundException();
    }
    Schedule schedule = scheduleRepository.findByIdForUpdate(scheduleId)
        .orElseThrow(ScheduleNotFoundException::new);
    if (schedule.getCreatorId() != actorId) {
      throw new ScheduleNotFoundException();
    }
    return schedule;
  }
}
