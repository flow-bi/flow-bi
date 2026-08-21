package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.dto.ScheduleUpdateCommand;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleStatus;
import com.flowbi.domain.schedule.entity.ScheduleTarget;
import com.flowbi.domain.schedule.exception.RoomReservationScheduleCancelConflictException;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import java.time.ZoneId;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class DatabaseScheduleModificationService implements ScheduleModificationService {

  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

  private final ScheduleRepository scheduleRepository;

  public DatabaseScheduleModificationService(ScheduleRepository scheduleRepository) {
    this.scheduleRepository = scheduleRepository;
  }

  @Override
  public Optional<ReservationSchedule> findReservationSchedule(Long scheduleId) {
    return scheduleRepository.findById(scheduleId)
        .filter(schedule -> schedule.getStatus() == ScheduleStatus.ACTIVE)
        .map(schedule -> new ReservationSchedule(schedule.getId(), schedule.getCreatorId()));
  }

  @Override
  public Optional<ReservationSchedule> findReservationScheduleForCancellation(Long scheduleId) {
    return scheduleRepository.findById(scheduleId)
        .map(schedule -> new ReservationSchedule(schedule.getId(), schedule.getCreatorId()));
  }

  @Override
  public Optional<ReservationScheduleDetails> findReservationScheduleDetails(Long scheduleId) {
    return scheduleRepository.findActiveByIdWithAssociations(scheduleId)
        .map(schedule -> new ReservationScheduleDetails(schedule.getCreatorId(),
            schedule.getDetail().getContent(), attendeeIds(schedule)));
  }

  @Override
  public void update(UpdateReservationScheduleCommand command) {
    scheduleRepository.findByIdWithAssociationsForUpdate(command.scheduleId())
        .filter(schedule -> schedule.getStatus() == ScheduleStatus.ACTIVE)
        .ifPresentOrElse(schedule -> updateSchedule(schedule,command),() -> {
          throw new IllegalStateException("Connected reservation schedule is unavailable");
        });
  }

  @Override
  public void cancelReservationSchedule(Long scheduleId,long actorId,OffsetDateTime cancelledAt) {
    Schedule schedule = scheduleRepository.findByIdWithAssociationsForUpdate(scheduleId)
        .orElseThrow(RoomReservationScheduleCancelConflictException::new);
    if (schedule.getCreatorId() != actorId) {
      throw new RoomReservationScheduleCancelConflictException();
    }
    if (schedule.getStatus() != ScheduleStatus.ACTIVE) {
      throw new RoomReservationScheduleCancelConflictException();
    }
    schedule.cancel(actorId,cancelledAt);
  }

  private void updateSchedule(Schedule schedule,UpdateReservationScheduleCommand command) {
    boolean creatorAttends = command.attendeeIds().contains(schedule.getCreatorId());
    List<Long> participantIds = command.attendeeIds().stream()
        .filter(attendeeId -> attendeeId != schedule.getCreatorId()).toList();
    List<Long> userTargetIds = schedule.getTargets().stream()
        .filter(
            target -> target.getType() == com.flowbi.domain.schedule.entity.ScheduleTargetType.USER)
        .map(ScheduleTarget::getUserId).toList();
    List<Long> teamTargetIds = schedule.getTargets().stream()
        .filter(
            target -> target.getType() == com.flowbi.domain.schedule.entity.ScheduleTargetType.TEAM)
        .map(ScheduleTarget::getTeamId).toList();
    List<Long> projectTargetIds = schedule.getTargets().stream().filter(
        target -> target.getType() == com.flowbi.domain.schedule.entity.ScheduleTargetType.PROJECT)
        .map(ScheduleTarget::getProjectId).toList();
    schedule.update(ScheduleUpdateCommand.of(command.title(),schedule.getType(),
        schedule.getVisibility(),command.startAt().atZone(KOREA_ZONE).toOffsetDateTime(),
        command.endAt().atZone(KOREA_ZONE).toOffsetDateTime(),false,schedule.getColorLabel(),
        command.description(),command.location(),creatorAttends,participantIds,userTargetIds,
        teamTargetIds,projectTargetIds));
  }

  private List<Long> attendeeIds(Schedule schedule) {
    List<Long> participantIds = schedule.getParticipants().stream()
        .map(participant -> participant.getUserId()).toList();
    if (!schedule.isCreatorAttends()) {
      return participantIds;
    }
    return java.util.stream.Stream
        .concat(java.util.stream.Stream.of(schedule.getCreatorId()),participantIds.stream())
        .toList();
  }
}
