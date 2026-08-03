package com.flowbi.domain.schedule;

import java.time.Instant;
import java.util.Set;

public interface ScheduleChangeAuditLogger {
  void record(Long actorId,Instant occurredAt,Set<Long> targetIds,boolean successful);

  static ScheduleChangeAuditLogger noop() {
    return (actorId,occurredAt,targetIds,successful) -> {
    };
  }
}
