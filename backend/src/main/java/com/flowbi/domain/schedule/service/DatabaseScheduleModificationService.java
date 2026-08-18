package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.entity.ScheduleDetail;
import com.flowbi.domain.schedule.entity.ScheduleTarget;
import com.flowbi.domain.schedule.repository.ScheduleDetailRepository;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.repository.ScheduleTargetRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class DatabaseScheduleModificationService implements ScheduleModificationService {

  private final ScheduleRepository scheduleRepository;
  private final ScheduleDetailRepository scheduleDetailRepository;
  private final ScheduleTargetRepository scheduleTargetRepository;

  public DatabaseScheduleModificationService(ScheduleRepository scheduleRepository,
      ScheduleDetailRepository scheduleDetailRepository,
      ScheduleTargetRepository scheduleTargetRepository) {
    this.scheduleRepository = scheduleRepository;
    this.scheduleDetailRepository = scheduleDetailRepository;
    this.scheduleTargetRepository = scheduleTargetRepository;
  }

  @Override
  public Optional<ReservationSchedule> findReservationSchedule(Long scheduleId) {
    return scheduleRepository.findById(scheduleId).filter(schedule -> schedule.isRoomReservation())
        .map(schedule -> new ReservationSchedule(schedule.getId(), schedule.getCreatorId()));
  }

  @Override
  public void update(UpdateReservationScheduleCommand command) {
    scheduleRepository.findById(command.scheduleId())
        .filter(schedule -> schedule.isRoomReservation())
        .ifPresentOrElse(schedule -> updateSchedule(schedule,command),() -> {
          throw new IllegalStateException("Connected reservation schedule is unavailable");
        });
  }

  private void updateSchedule(com.flowbi.domain.schedule.entity.Schedule schedule,
      UpdateReservationScheduleCommand command) {
    schedule.updateRoomReservation(command.title(),command.startAt(),command.endAt());
    ScheduleDetail detail = scheduleDetailRepository.findByScheduleId(command.scheduleId())
        .orElseGet(
            () -> ScheduleDetail.of(command.scheduleId(),command.description(),command.location()));
    detail.update(command.description(),command.location());
    scheduleDetailRepository.save(detail);
    scheduleTargetRepository.deleteByScheduleId(command.scheduleId());
    scheduleTargetRepository.saveAll(command.attendeeIds().stream()
        .map(attendeeId -> ScheduleTarget.attendee(command.scheduleId(),attendeeId)).toList());
  }
}
