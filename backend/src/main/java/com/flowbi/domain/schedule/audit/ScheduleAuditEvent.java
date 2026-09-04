package com.flowbi.domain.schedule.audit;

import java.time.OffsetDateTime;

/**
 * Contains only the cancellation audit fields permitted by the Calendar
 * contract.
 */
public record ScheduleAuditEvent(long actorId, OffsetDateTime occurredAt, long scheduleId,
    ScheduleAuditResult result) {
}
