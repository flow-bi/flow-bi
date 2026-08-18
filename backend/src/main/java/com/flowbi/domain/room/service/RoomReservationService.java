package com.flowbi.domain.room.service;

import com.flowbi.domain.room.dto.CreateRoomReservationCommand;
import com.flowbi.domain.room.dto.CreateRoomReservationResult;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.dto.UpdateRoomReservationCommand;
import com.flowbi.domain.room.dto.UpdateRoomReservationResult;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.entity.ScheduleStatus;
import com.flowbi.domain.schedule.service.CreateScheduleCommand;
import com.flowbi.domain.schedule.service.ScheduleCreationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService.ReservationSchedule;
import com.flowbi.domain.schedule.service.ScheduleModificationService.UpdateReservationScheduleCommand;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomReservationService {

  private static final LocalTime BUSINESS_START = LocalTime.of(9,0);
  private static final LocalTime BUSINESS_END = LocalTime.of(18,0);

  private final RoomRepository roomRepository;
  private final RoomReservationRepository reservationRepository;
  private final ReservationParticipantAccessService participantAccessService;
  private final ScheduleCreationService scheduleCreationService;
  private final ScheduleModificationService scheduleModificationService;

  public RoomReservationService(RoomRepository roomRepository,
      RoomReservationRepository reservationRepository,
      ReservationParticipantAccessService participantAccessService,
      ScheduleCreationService scheduleCreationService) {
    this(roomRepository, reservationRepository, participantAccessService, scheduleCreationService,
        null);
  }

  @Autowired
  public RoomReservationService(RoomRepository roomRepository,
      RoomReservationRepository reservationRepository,
      ReservationParticipantAccessService participantAccessService,
      ScheduleCreationService scheduleCreationService,
      ScheduleModificationService scheduleModificationService) {
    this.roomRepository = roomRepository;
    this.reservationRepository = reservationRepository;
    this.participantAccessService = participantAccessService;
    this.scheduleCreationService = scheduleCreationService;
    this.scheduleModificationService = scheduleModificationService;
  }

  @Transactional
  public CreateRoomReservationResult create(ReservationActor actor,
      CreateRoomReservationCommand command) {
    validateActor(actor);
    validateCommand(command);
    List<Long> attendeeIds = normalizeAttendees(command.attendeeIds());
    validateAttendees(actor,attendeeIds);

    Room room = roomRepository.findByIdForUpdate(command.roomId())
        .orElseThrow(() -> new RoomReservationApplicationException("ROOM_NOT_FOUND"));
    if (room.getCapacity() == null || attendeeIds.size() > room.getCapacity()) {
      throw new RoomReservationApplicationException("ROOM_CAPACITY_EXCEEDED");
    }
    if (reservationRepository.existsReservedOverlap(room.getId(),command.startAt(),
        command.endAt())) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_CONFLICT");
    }

    Long scheduleId = scheduleCreationService.create(new CreateScheduleCommand(command.title(),
        command.startAt(), command.endAt(), actor.userId(), attendeeIds, command.description(),
        room.getName(), ScheduleStatus.ACTIVE)).scheduleId();
    RoomReservation reservation = reservationRepository.save(RoomReservation.of(null,room,
        scheduleId,command.title(),command.startAt(),command.endAt(),ReservationStatus.RESERVED));
    return new CreateRoomReservationResult(reservation.getId(), scheduleId);
  }

  @Transactional
  public UpdateRoomReservationResult update(ReservationActor actor,
      UpdateRoomReservationCommand command) {
    validateActor(actor);
    validateUpdateCommand(command);
    List<Long> attendeeIds = normalizeAttendees(command.attendeeIds());

    RoomReservation reservation = reservationRepository.findByIdForUpdate(command.reservationId())
        .orElseThrow(() -> new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"));
    ReservationSchedule schedule = findOwnedSchedule(reservation,actor);
    if (reservation.getStatus() != ReservationStatus.RESERVED) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_NOT_EDITABLE");
    }
    validateAttendees(actor,attendeeIds);
    Room room = roomRepository.findByIdForUpdate(command.roomId())
        .orElseThrow(() -> new RoomReservationApplicationException("ROOM_NOT_FOUND"));
    if (room.getCapacity() == null || attendeeIds.size() > room.getCapacity()) {
      throw new RoomReservationApplicationException("ROOM_CAPACITY_EXCEEDED");
    }
    if (reservationRepository.existsReservedOverlapExcluding(room.getId(),command.startAt(),
        command.endAt(),reservation.getId())) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_CONFLICT");
    }

    reservation.update(room,command.title(),command.startAt(),command.endAt());
    scheduleModificationService.update(new UpdateReservationScheduleCommand(schedule.scheduleId(),
        command.title(), command.startAt(), command.endAt(), attendeeIds, command.description(),
        room.getName()));
    return new UpdateRoomReservationResult(reservation.getId(), schedule.scheduleId());
  }

  private void validateActor(ReservationActor actor) {
    if (actor == null || actor.userId() == null || actor.userId() < 1) {
      throw new RoomReservationApplicationException("RESERVATION_ACTOR_REQUIRED");
    }
  }

  private void validateCommand(CreateRoomReservationCommand command) {
    if (command == null) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
    validateReservationDetails(command.roomId(),command.title(),command.startAt(),command.endAt(),
        command.description());
  }

  private void validateUpdateCommand(UpdateRoomReservationCommand command) {
    if (command == null || command.reservationId() == null || command.reservationId() < 1) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
    validateReservationDetails(command.roomId(),command.title(),command.startAt(),command.endAt(),
        command.description());
  }

  private void validateReservationDetails(Long roomId,String title,java.time.LocalDateTime startAt,
      java.time.LocalDateTime endAt,String description) {
    if (roomId == null || roomId < 1 || title == null || title.isBlank() || title.length() > 200
        || startAt == null || endAt == null || !startAt.toLocalDate().equals(endAt.toLocalDate())
        || !startAt.toLocalTime().isBefore(endAt.toLocalTime())
        || startAt.toLocalTime().isBefore(BUSINESS_START)
        || endAt.toLocalTime().isAfter(BUSINESS_END)
        || description != null && description.length() > 200) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
  }

  private List<Long> normalizeAttendees(List<Long> attendeeIds) {
    if (attendeeIds == null || attendeeIds.isEmpty()) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
    if (attendeeIds.stream().anyMatch(id -> id == null || id < 1)) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
    List<Long> normalized = List.copyOf(new LinkedHashSet<>(attendeeIds));
    return normalized;
  }

  private void validateAttendees(ReservationActor actor,List<Long> attendeeIds) {
    if (attendeeIds.stream().anyMatch(id -> !participantAccessService.canAttend(actor,id))) {
      throw new RoomReservationApplicationException("RESERVATION_PARTICIPANT_FORBIDDEN");
    }
  }

  private ReservationSchedule findOwnedSchedule(RoomReservation reservation,
      ReservationActor actor) {
    if (scheduleModificationService == null) {
      throw new IllegalStateException("Reservation schedule modification is not configured");
    }
    ReservationSchedule schedule = scheduleModificationService
        .findReservationSchedule(reservation.getScheduleId())
        .orElseThrow(() -> new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"));
    if (!actor.userId().equals(schedule.creatorId())) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND");
    }
    return schedule;
  }
}
