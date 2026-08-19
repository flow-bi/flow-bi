package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.dto.ScheduleTargetOptions;
import com.flowbi.domain.schedule.repository.JdbcScheduleIdentityAdapter;
import org.springframework.stereotype.Service;

@Service
public class ScheduleTargetOptionsService {

  private final JdbcScheduleIdentityAdapter identityAdapter;

  public ScheduleTargetOptionsService(JdbcScheduleIdentityAdapter identityAdapter) {
    this.identityAdapter = identityAdapter;
  }

  public ScheduleTargetOptions findForActor(long actorId) {
    return identityAdapter.findTargetOptions(actorId);
  }
}
