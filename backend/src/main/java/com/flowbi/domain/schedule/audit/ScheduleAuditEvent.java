package com.flowbi.domain.schedule.audit;

import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;
import com.flowbi.domain.schedule.service.*;

import java.time.OffsetDateTime;

/**
 * Contains only the cancellation audit fields permitted by the Calendar
 * contract.
 */
public record ScheduleAuditEvent(long actorId, OffsetDateTime occurredAt, long scheduleId,
    ScheduleAuditResult result) {
}
