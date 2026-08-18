package com.flowbi.domain.schedule.port;

import java.util.Set;

/**
 * Calendar boundary for verified team membership and project participation. A
 * production adapter is connected with the authenticated principal in Task 7.
 */
public interface ScheduleAudienceLookup {

  Set<Long> memberTeamIds(long actorId,Set<Long> teamIds);

  Set<Long> memberProjectIds(long actorId,Set<Long> projectIds);
}
