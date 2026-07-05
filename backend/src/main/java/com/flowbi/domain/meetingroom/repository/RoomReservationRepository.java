package com.flowbi.domain.meetingroom.repository;

import com.flowbi.domain.meetingroom.entity.ReservationStatus;
import com.flowbi.domain.meetingroom.entity.RoomReservation;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomReservationRepository extends JpaRepository<RoomReservation, Long> {

  long countByStartAtGreaterThanEqualAndStartAtLessThan(LocalDateTime startAt,LocalDateTime endAt);

  @Query("""
      select count(reservation) > 0
      from RoomReservation reservation
      where reservation.roomId = :roomId
        and reservation.status <> com.flowbi.domain.meetingroom.entity.ReservationStatus.CANCELLED
        and (:excludeReservationId is null or reservation.reservationId <> :excludeReservationId)
        and reservation.startAt < :endAt
        and reservation.endAt > :startAt
      """)
  boolean existsOverlappingReservation(@Param("roomId") Long roomId,
      @Param("startAt") LocalDateTime startAt,@Param("endAt") LocalDateTime endAt,
      @Param("excludeReservationId") Long excludeReservationId);

  @Query(value = """
      select
        rr.reservation_id as reservationId,
        rr.room_id as roomId,
        rr.schedule_id as scheduleId,
        rr.title as title,
        rr.start_at as startAt,
        rr.end_at as endAt,
        rr.status as status,
        rr.cancelled_at as cancelledAt,
        rr.count as count,
        rr.field as field,
        s.creator_id as creatorId,
        u.name as creatorName,
        t.team_name as teamName
      from rooms_reservations rr
      join schedules s on s.schedule_id = rr.schedule_id
      join users u on u.user_id = s.creator_id
      left join teams t on t.team_id = u.team_id
      where rr.room_id = :roomId
        and rr.start_at < :endAt
        and rr.end_at > :startAt
      order by rr.start_at asc, rr.reservation_id asc
      """, nativeQuery = true)
  List<ReservationSummary> findSummariesByRoomAndRange(@Param("roomId") Long roomId,
      @Param("startAt") LocalDateTime startAt,@Param("endAt") LocalDateTime endAt);

  @Query("""
      select reservation
      from RoomReservation reservation
      where reservation.roomId = :roomId
        and (:status is null or reservation.status = :status)
        and reservation.startAt < :endAt
        and reservation.endAt > :startAt
      """)
  List<RoomReservation> findByRoomAndRangeAndStatus(@Param("roomId") Long roomId,
      @Param("startAt") LocalDateTime startAt,@Param("endAt") LocalDateTime endAt,
      @Param("status") ReservationStatus status);
}
