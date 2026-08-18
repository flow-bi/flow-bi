package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;

import com.flowbi.domain.schedule.port.ScheduleAuditWriter;
import java.time.Clock;
import java.time.OffsetDateTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ScheduleCancelService {

  private final ScheduleAuditWriter auditWriter;
  private final Clock clock;
  private final ScheduleCancelTransaction transaction;

  @Autowired
  public ScheduleCancelService(ScheduleAuditWriter auditWriter,
      ScheduleCancelTransaction transaction) {
    this(auditWriter, Clock.systemUTC(), transaction);
  }

  ScheduleCancelService(ScheduleAuditWriter auditWriter, Clock clock,
      ScheduleCancelTransaction transaction) {
    this.auditWriter = auditWriter;
    this.clock = clock;
    this.transaction = transaction;
  }

  public void cancel(long actorId,long scheduleId) {
    OffsetDateTime occurredAt = OffsetDateTime.now(clock);
    try {
      ScheduleAuditResult result = transaction.cancel(actorId,scheduleId,occurredAt);
      auditWriter.write(new ScheduleAuditEvent(actorId, occurredAt, scheduleId, result));
    } catch (ScheduleNotFoundException exception) {
      auditWriter.write(
          new ScheduleAuditEvent(actorId, occurredAt, scheduleId, ScheduleAuditResult.NOT_FOUND));
      throw exception;
    } catch (RoomReservationManagedScheduleException exception) {
      auditWriter.write(new ScheduleAuditEvent(actorId, occurredAt, scheduleId,
          ScheduleAuditResult.ROOM_RESERVATION_MANAGED));
      throw exception;
    }
  }
}
