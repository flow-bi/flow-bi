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
import com.flowbi.domain.schedule.exception.RoomReservationScheduleCancelConflictException;
import com.flowbi.domain.schedule.service.CreateScheduleCommand;
import com.flowbi.domain.schedule.service.ScheduleCreationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService.ReservationSchedule;
import com.flowbi.domain.schedule.service.ScheduleModificationService.UpdateReservationScheduleCommand;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomReservationService {

  private static final Logger AUDIT_LOG = LoggerFactory.getLogger(RoomReservationService.class);
  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

  private final RoomRepository roomRepository;
  private final RoomReservationRepository reservationRepository;
  private final ScheduleCreationService scheduleCreationService;
  private final ScheduleModificationService scheduleModificationService;
  private final RoomReservationRequestValidator requestValidator;
  private final ReservationAttendeeResolver attendeeResolver;
  private final ReservationScheduleOwnershipVerifier scheduleOwnershipVerifier;

  public RoomReservationService(RoomRepository roomRepository,
      RoomReservationRepository reservationRepository,
      ScheduleCreationService scheduleCreationService,
      ScheduleModificationService scheduleModificationService,
      RoomReservationRequestValidator requestValidator,
      ReservationAttendeeResolver attendeeResolver,
      ReservationScheduleOwnershipVerifier scheduleOwnershipVerifier) {
    this.roomRepository = roomRepository;
    this.reservationRepository = reservationRepository;
    this.scheduleCreationService = scheduleCreationService;
    this.scheduleModificationService = scheduleModificationService;
    this.requestValidator = requestValidator;
    this.attendeeResolver = attendeeResolver;
    this.scheduleOwnershipVerifier = scheduleOwnershipVerifier;
  }

  @Transactional
  public CreateRoomReservationResult create(ReservationActor actor,
      CreateRoomReservationCommand command) {
    requestValidator.validateActor(actor);
    validateCreateCommand(command);
    List<Long> attendeeIds = attendeeResolver.resolve(actor,command.attendeeIds(),
        command.creatorAttends());

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
    requestValidator.validateActor(actor);
    validateUpdateCommand(command);
    List<Long> normalizedAttendeeIds = attendeeResolver.normalize(command.attendeeIds());

    RoomReservation reservation = reservationRepository.findByIdForUpdate(command.reservationId())
        .orElseThrow(() -> new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"));
    ReservationSchedule schedule = scheduleOwnershipVerifier
        .findOwnedForUpdate(reservation.getScheduleId(),actor);
    if (reservation.getStatus() != ReservationStatus.RESERVED) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_NOT_EDITABLE");
    }
    List<Long> attendeeIds = attendeeResolver.resolveNormalized(actor,normalizedAttendeeIds,
        command.creatorAttends());
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

  @Transactional
  public void cancel(ReservationActor actor,Long reservationId) {
    requestValidator.validateActor(actor);
    requestValidator.validateCancellationReservationId(reservationId);
    RoomReservation reservation = reservationRepository.findByIdForUpdate(reservationId)
        .orElseThrow(() -> new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"));
    ReservationSchedule schedule = scheduleOwnershipVerifier
        .findOwnedForCancellation(reservation.getScheduleId(),actor);
    if (reservation.getStatus() == ReservationStatus.CANCELED) {
      writeCancellationAudit(actor.userId(),OffsetDateTime.now(),reservation.getId(),
          schedule.scheduleId(),"ALREADY_CANCELED");
      return;
    }
    OffsetDateTime cancelledAt = OffsetDateTime.now();
    try {
      scheduleModificationService.cancelReservationSchedule(schedule.scheduleId(),actor.userId(),
          cancelledAt);
    } catch (RoomReservationScheduleCancelConflictException exception) {
      writeCancellationAudit(actor.userId(),cancelledAt,reservation.getId(),schedule.scheduleId(),
          "CONFLICT");
      throw new RoomReservationApplicationException("ROOM_RESERVATION_CANCEL_CONFLICT");
    }
    reservation.cancel(cancelledAt.atZoneSameInstant(KOREA_ZONE).toLocalDateTime());
    writeCancellationAudit(actor.userId(),cancelledAt,reservation.getId(),schedule.scheduleId(),
        "CANCELED");
  }

  private void validateCreateCommand(CreateRoomReservationCommand command) {
    if (command == null) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
    requestValidator.validateCreate(command.roomId(),command.title(),command.startAt(),
        command.endAt(),command.description());
  }

  private void validateUpdateCommand(UpdateRoomReservationCommand command) {
    if (command == null) {
      throw new RoomReservationApplicationException("ROOM_RESERVATION_INVALID");
    }
    requestValidator.validateUpdate(command.reservationId(),command.roomId(),command.title(),
        command.startAt(),command.endAt(),command.description());
  }

  private void writeCancellationAudit(long actorId,OffsetDateTime occurredAt,Long reservationId,
      Long scheduleId,String result) {
    AUDIT_LOG.info("roomReservationCancellation actorId={}, occurredAt={}, reservationId={}, "
        + "scheduleId={}, result={}",actorId,occurredAt,reservationId,scheduleId,result);
  }
}
