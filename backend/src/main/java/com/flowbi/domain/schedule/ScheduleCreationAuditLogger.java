package com.flowbi.domain.schedule;

import java.time.Instant;
import java.util.Set;

public interface ScheduleCreationAuditLogger {
  void record(Long actorId,Instant occurredAt,Set<Long> targetIds,boolean successful);

  static ScheduleCreationAuditLogger noop() {
    return (actorId,occurredAt,targetIds,successful) -> {
    };
  }
}
