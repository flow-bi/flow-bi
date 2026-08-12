package com.flowbi.domain.room.service;

import com.flowbi.domain.room.dto.ReservationDisplayStatus;
import com.flowbi.domain.room.dto.RoomAvailabilityQuery;
import com.flowbi.domain.room.dto.RoomAvailabilityResponse;
import com.flowbi.domain.room.dto.RoomAvailabilityResponse.ReservationSummary;
import com.flowbi.domain.room.dto.RoomAvailabilityResponse.RoomSummary;
import com.flowbi.domain.room.dto.RoomDetailResponse;
import com.flowbi.domain.room.dto.RoomNotFoundException;
import com.flowbi.domain.room.dto.RoomQueryValidationException;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RoomAvailabilityService {

  private static final LocalTime BUSINESS_START = LocalTime.of(9,0);
  private static final LocalTime BUSINESS_END = LocalTime.of(18,0);
  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

  private final RoomRepository roomRepository;
  private final RoomReservationRepository reservationRepository;
  private final Clock clock;

  @Autowired
  public RoomAvailabilityService(RoomRepository roomRepository,
      RoomReservationRepository reservationRepository) {
    this(roomRepository, reservationRepository, Clock.system(KOREA_ZONE));
  }

  RoomAvailabilityService(RoomRepository roomRepository,
      RoomReservationRepository reservationRepository, Clock clock) {
    this.roomRepository = roomRepository;
    this.reservationRepository = reservationRepository;
    this.clock = clock;
  }

  public RoomAvailabilityResponse findAvailability(RoomAvailabilityQuery query) {
    ValidatedQuery validated = validate(query);
    List<RoomReservation> reservations = reservationRepository
        .findActiveOverlapping(validated.startAt(),validated.endAt());
    List<RoomSummary> rooms = roomRepository.findAllByOrderByIdAsc().stream()
        .map(room -> toSummary(room,reservations,validated))
        .sorted(Comparator.comparingInt((RankedRoom ranked) -> ranked.priority()).reversed()
            .thenComparing(ranked -> ranked.summary().id()))
        .map(RankedRoom::summary).toList();
    return new RoomAvailabilityResponse(rooms);
  }

  public RoomDetailResponse findRoomDetail(Long roomId) {
    if (roomId == null || roomId < 1) {
      throw new RoomQueryValidationException();
    }
    Room room = roomRepository.findById(roomId).orElseThrow(RoomNotFoundException::new);
    return new RoomDetailResponse(room.getId(), room.getName(), room.getCapacity(),
        room.getLocation(), true);
  }

  private ValidatedQuery validate(RoomAvailabilityQuery query) {
    if (query == null || query.date() == null
        || query.minimumCapacity() != null && query.minimumCapacity() < 1) {
      throw new RoomQueryValidationException();
    }
    LocalTime startTime = query.startTime() == null && query.endTime() == null
        ? BUSINESS_START
        : query.startTime();
    LocalTime endTime = query.startTime() == null && query.endTime() == null
        ? BUSINESS_END
        : query.endTime();
    if (startTime == null || endTime == null || startTime.isBefore(BUSINESS_START)
        || endTime.isAfter(BUSINESS_END) || !startTime.isBefore(endTime)) {
      throw new RoomQueryValidationException();
    }
    return new ValidatedQuery(LocalDateTime.of(query.date(),startTime),
        LocalDateTime.of(query.date(),endTime), query.minimumCapacity(),
        query.preferredReservationStatus(),
        !startTime.equals(BUSINESS_START) || !endTime.equals(BUSINESS_END));
  }

  private RankedRoom toSummary(Room room,List<RoomReservation> reservations,ValidatedQuery query) {
    List<ReservationSummary> summaries = reservations.stream()
        .filter(reservation -> reservation.getStatus() == ReservationStatus.RESERVED)
        .filter(reservation -> reservation.getRoom().getId().equals(room.getId()))
        .filter(reservation -> overlaps(reservation,query)).map(this::toReservationSummary)
        .toList();
    int priority = calculatePriority(room,summaries,query);
    return new RankedRoom(priority, new RoomSummary(room.getId(), room.getName(),
        room.getCapacity(), room.getLocation(), true, summaries));
  }

  private boolean overlaps(RoomReservation reservation,ValidatedQuery query) {
    return reservation.getStartAt().isBefore(query.endAt())
        && reservation.getEndAt().isAfter(query.startAt());
  }

  private ReservationSummary toReservationSummary(RoomReservation reservation) {
    LocalDateTime now = LocalDateTime.now(clock);
    ReservationDisplayStatus displayStatus = reservation.getStartAt().isAfter(now)
        ? ReservationDisplayStatus.UPCOMING
        : reservation.getEndAt().isAfter(now)
            ? ReservationDisplayStatus.IN_USE
            : ReservationDisplayStatus.COMPLETED;
    return new ReservationSummary(reservation.getId(), reservation.getTitle(),
        reservation.getStartAt(), reservation.getEndAt(), displayStatus);
  }

  private int calculatePriority(Room room,List<ReservationSummary> reservations,
      ValidatedQuery query) {
    int priority = 0;
    if (query.minimumCapacity() != null && room.getCapacity() != null
        && room.getCapacity() >= query.minimumCapacity()) {
      priority++;
    }
    if (query.hasExplicitTimeRange() && reservations.isEmpty()) {
      priority++;
    }
    if (query.preferredReservationStatus() != null && reservations.stream().anyMatch(
        reservation -> reservation.displayStatus() == query.preferredReservationStatus())) {
      priority++;
    }
    return priority;
  }

  private record ValidatedQuery(LocalDateTime startAt, LocalDateTime endAt, Integer minimumCapacity,
      ReservationDisplayStatus preferredReservationStatus, boolean hasExplicitTimeRange) {
  }

  private record RankedRoom(int priority, RoomSummary summary) {
  }
}
