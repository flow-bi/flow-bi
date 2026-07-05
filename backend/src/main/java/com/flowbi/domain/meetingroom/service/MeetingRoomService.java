package com.flowbi.domain.meetingroom.service;

import com.flowbi.common.exception.BusinessException;
import com.flowbi.common.exception.ErrorCode;
import com.flowbi.domain.meetingroom.dto.ReservationRequest;
import com.flowbi.domain.meetingroom.dto.ReservationResponse;
import com.flowbi.domain.meetingroom.dto.RoomResponse;
import com.flowbi.domain.meetingroom.entity.ReservationStatus;
import com.flowbi.domain.meetingroom.entity.Room;
import com.flowbi.domain.meetingroom.entity.RoomReservation;
import com.flowbi.domain.meetingroom.repository.ReservationSummary;
import com.flowbi.domain.meetingroom.repository.RoomRepository;
import com.flowbi.domain.meetingroom.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.dto.ScheduleRequest;
import com.flowbi.domain.schedule.dto.ScheduleResponse;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import com.flowbi.domain.schedule.service.ScheduleService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MeetingRoomService {

  private final RoomRepository roomRepository;
  private final RoomReservationRepository reservationRepository;
  private final ScheduleService scheduleService;

  public MeetingRoomService(RoomRepository roomRepository,
      RoomReservationRepository reservationRepository, ScheduleService scheduleService) {
    this.roomRepository = roomRepository;
    this.reservationRepository = reservationRepository;
    this.scheduleService = scheduleService;
  }

  @Transactional(readOnly = true)
  public List<RoomResponse> findRooms(Long capacity, LocalDate date, TimeRange timeRange,
      ReservationStatus status) {
    DateRange dateRange = date == null ? null : DateRange.forDate(date);
    return roomRepository.findPrioritized(capacity).stream()
        .sorted(roomPriorityComparator(dateRange, timeRange, status))
        .map(room -> toRoomResponse(room, dateRange)).toList();
  }

  @Transactional(readOnly = true)
  public List<ReservationResponse> findReservations(Long roomId, LocalDate date) {
    Room room = findRoom(roomId);
    DateRange range = DateRange.forDate(date);
    return findReservationSummaries(room.getRoomId(), range).stream().map(this::toResponse)
        .toList();
  }

  public ReservationResponse createReservation(Long userId, Long roomId, ReservationRequest request) {
    validateRequest(request);
    Room room = lockRoom(roomId);
    verifyNoOverlap(roomId, request.startAt(), request.endAt(), null);
    ScheduleResponse schedule = scheduleService.createForMeetingRoom(userId,
        toScheduleRequest(room, request));
    RoomReservation reservation = reservationRepository.save(new RoomReservation(roomId,
        schedule.scheduleId(), request.title(), request.startAt(), request.endAt(),
        ReservationStatus.RESERVED, request.count(), request.field()));
    return toResponse(reservation, null);
  }

  public ReservationResponse updateReservation(Long userId, Long reservationId,
      ReservationRequest request) {
    validateRequest(request);
    RoomReservation reservation = findReservation(reservationId);
    if (reservation.getStatus() == ReservationStatus.CANCELLED) {
      throw new BusinessException(ErrorCode.MEETINGROOM_CANCELLED_RESERVATION);
    }
    Room room = lockRoom(reservation.getRoomId());
    verifyNoOverlap(reservation.getRoomId(), request.startAt(), request.endAt(), reservationId);
    scheduleService.update(userId, reservation.getScheduleId(), toScheduleRequest(room, request));
    reservation.update(request.title(), request.startAt(), request.endAt(), request.count(),
        request.field());
    return toResponse(reservation, null);
  }

  public void cancelReservation(Long userId, Long reservationId) {
    RoomReservation reservation = findReservation(reservationId);
    if (reservation.getStatus() == ReservationStatus.CANCELLED) {
      return;
    }
    lockRoom(reservation.getRoomId());
    reservation.cancel();
    scheduleService.deleteForMeetingRoom(userId, reservation.getScheduleId());
  }

  private Comparator<Room> roomPriorityComparator(DateRange dateRange, TimeRange timeRange,
      ReservationStatus status) {
    return Comparator.comparingInt(room -> matchesReservationSearch(room, dateRange, timeRange,
        status) ? 0 : 1);
  }

  private boolean matchesReservationSearch(Room room, DateRange dateRange, TimeRange timeRange,
      ReservationStatus status) {
    if (dateRange == null && timeRange == null && status == null) {
      return true;
    }
    if (dateRange == null) {
      return true;
    }
    LocalDateTime startAt = timeRange == null ? dateRange.start() : dateRange.date().atTime(
        timeRange.start());
    LocalDateTime endAt = timeRange == null ? dateRange.end() : dateRange.date().atTime(
        timeRange.end());
    return !reservationRepository
        .findByRoomAndRangeAndStatus(room.getRoomId(), startAt, endAt, status).isEmpty();
  }

  private RoomResponse toRoomResponse(Room room, DateRange dateRange) {
    List<ReservationResponse> reservations = dateRange == null ? List.of()
        : findReservationSummaries(room.getRoomId(), dateRange).stream().map(this::toResponse)
            .toList();
    return new RoomResponse(room.getRoomId(), room.getRoomName(), room.getCapacity(),
        room.getLocation(), room.getField(), reservations);
  }

  private List<ReservationSummary> findReservationSummaries(Long roomId, DateRange range) {
    return reservationRepository.findSummariesByRoomAndRange(roomId, range.start(), range.end());
  }

  private ReservationResponse toResponse(ReservationSummary summary) {
    return new ReservationResponse(summary.getReservationId(), summary.getRoomId(),
        summary.getScheduleId(), summary.getTitle(), summary.getStartAt(), summary.getEndAt(),
        ReservationStatus.valueOf(summary.getStatus()), summary.getCancelledAt(),
        summary.getCount(), summary.getField(), summary.getTeamName());
  }

  private ReservationResponse toResponse(RoomReservation reservation, String teamName) {
    return new ReservationResponse(reservation.getReservationId(), reservation.getRoomId(),
        reservation.getScheduleId(), reservation.getTitle(), reservation.getStartAt(),
        reservation.getEndAt(), reservation.getStatus(), reservation.getCancelledAt(),
        reservation.getCount(), reservation.getField(), teamName);
  }

  private ScheduleRequest toScheduleRequest(Room room, ReservationRequest request) {
    return new ScheduleRequest(request.title(),
        request.scheduleType() == null ? ScheduleType.PERSONAL : request.scheduleType(),
        request.visibility() == null ? ScheduleVisibility.PRIVATE : request.visibility(),
        request.startAt(), request.endAt(),
        request.colorLabel() == null ? "파랑" : request.colorLabel(), room.getLocation(),
        request.field(), request.targets());
  }

  private void validateRequest(ReservationRequest request) {
    if (!request.startAt().isBefore(request.endAt())) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, "종료 일시는 시작 일시보다 이후여야 합니다.");
    }
  }

  private void verifyNoOverlap(Long roomId, LocalDateTime startAt, LocalDateTime endAt,
      Long excludeReservationId) {
    if (reservationRepository.existsOverlappingReservation(roomId, startAt, endAt,
        excludeReservationId)) {
      throw new BusinessException(ErrorCode.MEETINGROOM_RESERVATION_CONFLICT);
    }
  }

  private Room findRoom(Long roomId) {
    return roomRepository.findById(roomId)
        .orElseThrow(() -> new BusinessException(ErrorCode.MEETINGROOM_ROOM_NOT_FOUND));
  }

  private Room lockRoom(Long roomId) {
    return roomRepository.findByIdForUpdate(roomId)
        .orElseThrow(() -> new BusinessException(ErrorCode.MEETINGROOM_ROOM_NOT_FOUND));
  }

  private RoomReservation findReservation(Long reservationId) {
    return reservationRepository.findById(reservationId)
        .orElseThrow(() -> new BusinessException(ErrorCode.MEETINGROOM_RESERVATION_NOT_FOUND));
  }

  public record TimeRange(LocalTime start, LocalTime end) {
  }

  private record DateRange(LocalDate date, LocalDateTime start, LocalDateTime end) {

    static DateRange forDate(LocalDate date) {
      return new DateRange(date, date.atStartOfDay(), date.plusDays(1).atStartOfDay());
    }
  }
}
