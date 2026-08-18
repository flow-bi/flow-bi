package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleColorLabel;
import com.flowbi.domain.schedule.entity.ScheduleStatus;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DatabaseScheduleCreationService implements ScheduleCreationService {

  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

  private final ScheduleRepository scheduleRepository;

  public DatabaseScheduleCreationService(ScheduleRepository scheduleRepository) {
    this.scheduleRepository = scheduleRepository;
  }

  @Override
  public CreatedSchedule create(CreateScheduleCommand command) {
    if (command.status() != ScheduleStatus.ACTIVE) {
      throw new IllegalArgumentException("A room reservation schedule must be active");
    }
    boolean creatorAttends = command.attendeeIds().contains(command.creatorId());
    List<Long> participantIds = command.attendeeIds().stream()
        .filter(attendeeId -> !attendeeId.equals(command.creatorId())).toList();
    var scheduleCommand = com.flowbi.domain.schedule.dto.ScheduleCreateCommand.of(
        command.creatorId(),command.title(),ScheduleType.PERSONAL,ScheduleVisibility.PRIVATE,
        command.startAt().atZone(KOREA_ZONE).toOffsetDateTime(),
        command.endAt().atZone(KOREA_ZONE).toOffsetDateTime(),false,ScheduleColorLabel.BLUE,
        command.description(),command.location(),creatorAttends,participantIds,List.of(),List.of(),
        List.of());
    Schedule schedule = scheduleRepository.save(Schedule.create(scheduleCommand));
    return new CreatedSchedule(schedule.getId());
  }
}
