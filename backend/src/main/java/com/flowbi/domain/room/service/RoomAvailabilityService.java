package com.flowbi.domain.room.service;

import com.flowbi.domain.room.dto.ReservationDisplayStatus;
import com.flowbi.domain.room.dto.RoomAvailabilityQuery;
import com.flowbi.domain.room.dto.RoomAvailabilityResponse;
import com.flowbi.domain.room.dto.RoomAvailabilityStatus;
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
    List<Room> registeredRooms = roomRepository.findAllByOrderByIdAsc();
    if (registeredRooms.isEmpty()) {
      return new RoomAvailabilityResponse(List.of());
    }
    List<RoomReservation> reservations = reservationRepository
        .findActiveOverlapping(validated.startAt(),validated.endAt());
    List<RoomSummary> rooms = registeredRooms.stream()
        .map(room -> toSummary(room,reservations,validated))
        .filter(ranked -> matches(ranked.room(),ranked.reservations(),validated))
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
        query.availabilityStatus());
  }

  private RankedRoom toSummary(Room room,List<RoomReservation> reservations,ValidatedQuery query) {
    List<ReservationSummary> summaries = reservations.stream()
        .filter(reservation -> reservation.getStatus() == ReservationStatus.RESERVED)
        .filter(reservation -> reservation.getRoom().getId().equals(room.getId()))
        .filter(reservation -> overlaps(reservation,query)).map(this::toReservationSummary)
        .toList();
    return new RankedRoom(room, summaries, new RoomSummary(room.getId(), room.getName(),
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

  private boolean matches(Room room,List<ReservationSummary> reservations,ValidatedQuery query) {
    if (query.minimumCapacity() != null
        && (room.getCapacity() == null || room.getCapacity() < query.minimumCapacity())) {
      return false;
    }
    if (query.availabilityStatus() == RoomAvailabilityStatus.AVAILABLE) {
      return reservations.isEmpty();
    }
    if (query.availabilityStatus() == RoomAvailabilityStatus.RESERVED) {
      return !reservations.isEmpty();
    }
    return true;
  }

  private record ValidatedQuery(LocalDateTime startAt, LocalDateTime endAt, Integer minimumCapacity,
      RoomAvailabilityStatus availabilityStatus) {
  }

  private record RankedRoom(Room room, List<ReservationSummary> reservations, RoomSummary summary) {
  }
}
