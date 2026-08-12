package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomAvailabilityQuery;
import com.flowbi.domain.room.dto.UpdateRoomReservationCommand;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleDetail;
import com.flowbi.domain.schedule.entity.ScheduleStatus;
import com.flowbi.domain.schedule.entity.ScheduleTarget;
import com.flowbi.domain.schedule.repository.ScheduleDetailRepository;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.repository.ScheduleTargetRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class RoomReservationUpdateTransactionTest {

  private static final ReservationActor OWNER = new ReservationActor(10L);
  private static final LocalDateTime OLD_START = LocalDateTime.of(2026,8,10,10,0);
  private static final LocalDateTime OLD_END = LocalDateTime.of(2026,8,10,11,0);
  private static final LocalDateTime NEW_START = LocalDateTime.of(2026,8,10,11,0);
  private static final LocalDateTime NEW_END = LocalDateTime.of(2026,8,10,12,0);

  @Autowired
  private RoomReservationService roomReservationService;
  @Autowired
  private RoomAvailabilityService roomAvailabilityService;
  @Autowired
  private RoomRepository roomRepository;
  @Autowired
  private RoomReservationRepository reservationRepository;
  @Autowired
  private ScheduleRepository scheduleRepository;
  @Autowired
  private ScheduleDetailRepository scheduleDetailRepository;
  @Autowired
  private ScheduleTargetRepository scheduleTargetRepository;
  @Autowired
  private UserRepository userRepository;

  private Long reservationId;
  private Long scheduleId;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    scheduleTargetRepository.deleteAll();
    scheduleDetailRepository.deleteAll();
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    userRepository.deleteAll();
    roomRepository.saveAll(List.of(Room.of(1L,"Orchid",4L,"3F"),Room.of(2L,"Iris",4L,"4F")));
    userRepository
        .saveAll(List.of(User.of(10L,"ACTIVE"),User.of(11L,"ACTIVE"),User.of(12L,"ACTIVE")));
    Schedule schedule = scheduleRepository
        .save(Schedule.roomReservation("Old title",OLD_START,OLD_END,10L,ScheduleStatus.ACTIVE));
    scheduleId = schedule.getId();
    scheduleDetailRepository.save(ScheduleDetail.of(scheduleId,"Old detail","Orchid"));
    scheduleTargetRepository.saveAll(
        List.of(ScheduleTarget.attendee(scheduleId,10L),ScheduleTarget.attendee(scheduleId,11L)));
    reservationId = reservationRepository
        .save(RoomReservation.of(null,roomRepository.findById(1L).orElseThrow(),scheduleId,
            "Old title",OLD_START,OLD_END,ReservationStatus.RESERVED))
        .getId();
  }

  @Test
  void updatesReservationAndScheduleTogetherAndAvailabilityShowsTheNewReservation() {
    var result = roomReservationService.update(OWNER,new UpdateRoomReservationCommand(reservationId,
        2L, "Updated title", NEW_START, NEW_END, List.of(11L,12L,11L), "Updated detail"));

    assertThat(result.reservationId()).isEqualTo(reservationId);
    assertThat(result.scheduleId()).isEqualTo(scheduleId);
    RoomReservation reservation = reservationRepository.findById(reservationId).orElseThrow();
    assertThat(reservation.getRoom().getId()).isEqualTo(2L);
    assertThat(reservation.getTitle()).isEqualTo("Updated title");
    assertThat(reservation.getStartAt()).isEqualTo(NEW_START);
    assertThat(reservation.getEndAt()).isEqualTo(NEW_END);
    Schedule schedule = scheduleRepository.findById(scheduleId).orElseThrow();
    assertThat(schedule.getTitle()).isEqualTo("Updated title");
    assertThat(schedule.getStartAt()).isEqualTo(NEW_START);
    assertThat(schedule.getEndAt()).isEqualTo(NEW_END);
    ScheduleDetail detail = scheduleDetailRepository.findByScheduleId(scheduleId).orElseThrow();
    assertThat(detail.getContent()).isEqualTo("Updated detail");
    assertThat(detail.getLocation()).isEqualTo("Iris");
    assertThat(scheduleTargetRepository.findAllByScheduleIdOrderByIdAsc(scheduleId))
        .extracting(ScheduleTarget::getUserId).containsExactly(11L,12L);
    assertThat(roomAvailabilityService
        .findAvailability(new RoomAvailabilityQuery(NEW_START.toLocalDate(), LocalTime.of(9,0),
            LocalTime.of(18,0), null, null))
        .rooms().stream().filter(room -> room.id().equals(2L)).findFirst().orElseThrow()
        .reservations()).extracting(reservationSummary -> reservationSummary.id())
        .containsExactly(reservationId);
  }
}
