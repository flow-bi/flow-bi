package com.flowbi.domain.room.repository;

import com.flowbi.domain.room.entity.RoomReservation;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RoomReservationRepository
    extends
      org.springframework.data.repository.Repository<RoomReservation, Long> {

  @Query("""
      select reservation from RoomReservation reservation
      join fetch reservation.room
      where reservation.status = com.flowbi.domain.room.entity.ReservationStatus.RESERVED
        and reservation.startAt < :endAt
        and reservation.endAt > :startAt
      order by reservation.startAt asc, reservation.id asc
      """)
  List<RoomReservation> findActiveOverlapping(@Param("startAt") LocalDateTime startAt,
      @Param("endAt") LocalDateTime endAt);

  @Query("""
      select (count(reservation) > 0) from RoomReservation reservation
      where reservation.room.id = :roomId
        and reservation.status = com.flowbi.domain.room.entity.ReservationStatus.RESERVED
        and reservation.startAt < :endAt
        and reservation.endAt > :startAt
      """)
  boolean existsReservedOverlap(@Param("roomId") Long roomId,
      @Param("startAt") LocalDateTime startAt,@Param("endAt") LocalDateTime endAt);

  @Query("""
      select (count(reservation) > 0) from RoomReservation reservation
      where reservation.room.id = :roomId
        and reservation.id <> :reservationId
        and reservation.status = com.flowbi.domain.room.entity.ReservationStatus.RESERVED
        and reservation.startAt < :endAt
        and reservation.endAt > :startAt
      """)
  boolean existsReservedOverlapExcluding(@Param("roomId") Long roomId,
      @Param("startAt") LocalDateTime startAt,@Param("endAt") LocalDateTime endAt,
      @Param("reservationId") Long reservationId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select reservation from RoomReservation reservation where reservation.id = :reservationId")
  Optional<RoomReservation> findByIdForUpdate(@Param("reservationId") Long reservationId);

  Optional<RoomReservation> findById(Long reservationId);

  RoomReservation save(RoomReservation reservation);

  long count();

  void deleteAll();
}
