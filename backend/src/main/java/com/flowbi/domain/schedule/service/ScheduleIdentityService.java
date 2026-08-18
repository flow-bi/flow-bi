package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.dto.AttendeeCandidate;
import com.flowbi.domain.schedule.repository.JdbcScheduleIdentityAdapter;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ScheduleIdentityService {

  private final JdbcScheduleIdentityAdapter identityAdapter;

  public ScheduleIdentityService(JdbcScheduleIdentityAdapter identityAdapter) {
    this.identityAdapter = identityAdapter;
  }

  public void requireActiveActor(long actorId) {
    identityAdapter.requireActiveActor(actorId);
  }

  public List<AttendeeCandidate> searchActiveUsers(String query) {
    return identityAdapter.searchActiveUsers(query);
  }
}
