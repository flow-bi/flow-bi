package com.flowbi.domain.schedule;

import java.util.List;

public interface ScheduleAttendeeCandidateReader {
  List<ScheduleAttendeeCandidateResponse> searchAccessibleActive(Long requestingUserId,
      String normalizedQuery,int maximumResults);

  static ScheduleAttendeeCandidateReader none() {
    return (requestingUserId,normalizedQuery,maximumResults) -> List.of();
  }
}
