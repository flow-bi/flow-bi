package com.flowbi.domain.room.service;

import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.dto.RoomReservationDetailResponse;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleIdentityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RoomReservationDetailService {

  private final RoomReservationRepository reservationRepository;
  private final ScheduleModificationService scheduleModificationService;
  private final ScheduleIdentityService scheduleIdentityService;

  public RoomReservationDetailService(RoomReservationRepository reservationRepository,
      ScheduleModificationService scheduleModificationService,
      ScheduleIdentityService scheduleIdentityService) {
    this.reservationRepository = reservationRepository;
    this.scheduleModificationService = scheduleModificationService;
    this.scheduleIdentityService = scheduleIdentityService;
  }

  public RoomReservationDetailResponse findOwnedReservation(Long userId,Long reservationId) {
    if (userId == null || userId < 1 || reservationId == null || reservationId < 1) {
      throw notFound();
    }
    RoomReservation reservation = reservationRepository.findById(reservationId)
        .orElseThrow(this::notFound);
    var schedule = scheduleModificationService
        .findReservationScheduleDetails(reservation.getScheduleId()).orElseThrow(this::notFound);
    if (!userId.equals(schedule.creatorId())) {
      throw notFound();
    }
    var attendeeIds = schedule.attendeeIds();
    var attendees = scheduleIdentityService.findUserDisplayNames(attendeeIds).stream()
        .map(attendee -> new RoomReservationDetailResponse.Attendee(attendee.userId(),
            attendee.displayName()))
        .toList();
    if (!attendeeIds
        .equals(attendees.stream().map(RoomReservationDetailResponse.Attendee::userId).toList())) {
      throw notFound();
    }
    return new RoomReservationDetailResponse(reservation.getId(), reservation.getRoom().getId(),
        reservation.getTitle(), reservation.getStartAt(), reservation.getEndAt(), attendeeIds,
        attendees, schedule.description(), reservation.getStatus() == ReservationStatus.RESERVED);
  }

  private RoomReservationApplicationException notFound() {
    return new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND");
  }
}
