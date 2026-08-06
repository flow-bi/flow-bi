package com.flowbi.domain.schedule;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;

public record ScheduleQuery(long actorId, OffsetDateTime from, OffsetDateTime to) {

  private static final ZoneId DISPLAY_ZONE = ZoneId.of("Asia/Seoul");
  private static final Duration MAXIMUM_PERIOD = Duration.ofDays(31);

  public static ScheduleQuery of(long actorId,OffsetDateTime from,OffsetDateTime to) {
    if (actorId <= 0 || from == null || to == null) {
      throw new InvalidScheduleQueryException("actor and period are required");
    }
    OffsetDateTime seoulFrom = from.atZoneSameInstant(DISPLAY_ZONE).toOffsetDateTime();
    OffsetDateTime seoulTo = to.atZoneSameInstant(DISPLAY_ZONE).toOffsetDateTime();
    if (!seoulTo.isAfter(seoulFrom)) {
      throw new InvalidScheduleQueryException("to must be after from");
    }
    if (Duration.between(seoulFrom,seoulTo).compareTo(MAXIMUM_PERIOD) > 0) {
      throw new InvalidScheduleQueryException("period must not exceed 31 days");
    }
    return new ScheduleQuery(actorId, seoulFrom, seoulTo);
  }
}
