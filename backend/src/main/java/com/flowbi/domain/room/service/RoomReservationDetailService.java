package com.flowbi.domain.room.service;

import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.dto.RoomReservationDetailResponse;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleDetail;
import com.flowbi.domain.schedule.entity.ScheduleTarget;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RoomReservationDetailService {

  private final RoomReservationRepository reservationRepository;
  private final EntityManager entityManager;

  public RoomReservationDetailService(RoomReservationRepository reservationRepository,
      EntityManager entityManager) {
    this.reservationRepository = reservationRepository;
    this.entityManager = entityManager;
  }

  public RoomReservationDetailResponse findOwnedReservation(Long userId,Long reservationId) {
    if (userId == null || userId < 1 || reservationId == null || reservationId < 1) {
      throw notFound();
    }
    RoomReservation reservation = reservationRepository.findById(reservationId)
        .orElseThrow(this::notFound);
    Schedule schedule = entityManager.find(Schedule.class,reservation.getScheduleId());
    if (schedule == null || !schedule.isRoomReservation()
        || !userId.equals(schedule.getCreatorId())) {
      throw notFound();
    }
    String description = entityManager.createQuery("""
        select detail from ScheduleDetail detail where detail.scheduleId = :scheduleId
        """,ScheduleDetail.class).setParameter("scheduleId",schedule.getId()).getResultStream()
        .findFirst().map(ScheduleDetail::getContent).orElse(null);
    List<Long> attendeeIds = entityManager
        .createQuery(
            """
                select target from ScheduleTarget target where target.scheduleId = :scheduleId order by target.id
                """,
            ScheduleTarget.class)
        .setParameter("scheduleId",schedule.getId()).getResultStream()
        .map(ScheduleTarget::getUserId).toList();
    return new RoomReservationDetailResponse(reservation.getId(), reservation.getRoom().getId(),
        reservation.getTitle(), reservation.getStartAt(), reservation.getEndAt(), attendeeIds,
        description, reservation.getStatus() == ReservationStatus.RESERVED);
  }

  private RoomReservationApplicationException notFound() {
    return new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND");
  }
}
