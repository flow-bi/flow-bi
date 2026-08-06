package com.flowbi.domain.schedule.port;

import com.flowbi.domain.schedule.ScheduleAuditEvent;

/**
 * Calendar boundary for minimum cancellation audit events; an adapter is
 * supplied by operations.
 */
public interface ScheduleAuditWriter {

  void write(ScheduleAuditEvent event);
}
