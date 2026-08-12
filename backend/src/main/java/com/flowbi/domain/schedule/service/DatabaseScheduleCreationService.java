package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleDetail;
import com.flowbi.domain.schedule.entity.ScheduleTarget;
import com.flowbi.domain.schedule.repository.ScheduleDetailRepository;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.repository.ScheduleTargetRepository;
import org.springframework.stereotype.Service;

@Service
public class DatabaseScheduleCreationService implements ScheduleCreationService {

  private final ScheduleRepository scheduleRepository;
  private final ScheduleDetailRepository scheduleDetailRepository;
  private final ScheduleTargetRepository scheduleTargetRepository;

  public DatabaseScheduleCreationService(ScheduleRepository scheduleRepository,
      ScheduleDetailRepository scheduleDetailRepository,
      ScheduleTargetRepository scheduleTargetRepository) {
    this.scheduleRepository = scheduleRepository;
    this.scheduleDetailRepository = scheduleDetailRepository;
    this.scheduleTargetRepository = scheduleTargetRepository;
  }

  @Override
  public CreatedSchedule create(CreateScheduleCommand command) {
    Schedule schedule = scheduleRepository.save(Schedule.roomReservation(command.title(),
        command.startAt(),command.endAt(),command.creatorId(),command.status()));
    scheduleDetailRepository
        .save(ScheduleDetail.of(schedule.getId(),command.description(),command.location()));
    scheduleTargetRepository.saveAll(command.attendeeIds().stream()
        .map(attendeeId -> ScheduleTarget.attendee(schedule.getId(),attendeeId)).toList());
    return new CreatedSchedule(schedule.getId());
  }
}
