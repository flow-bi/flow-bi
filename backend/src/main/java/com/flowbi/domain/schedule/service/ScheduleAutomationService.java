package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.dto.ScheduleRequest;
import com.flowbi.domain.schedule.dto.ScheduleResponse;

public interface ScheduleAutomationService {

  ScheduleResponse createForMeetingRoom(Long creatorId,ScheduleRequest request);

  void deleteForMeetingRoom(Long creatorId,Long scheduleId);
}
