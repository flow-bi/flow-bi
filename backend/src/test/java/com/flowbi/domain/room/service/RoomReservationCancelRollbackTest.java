package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleStatus;
import com.flowbi.domain.schedule.exception.RoomReservationScheduleCancelConflictException;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService.ReservationSchedule;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class RoomReservationCancelRollbackTest {

  private static final LocalDateTime START = LocalDateTime.of(2026,8,10,10,0);
  private static final LocalDateTime END = LocalDateTime.of(2026,8,10,11,0);

  @Autowired
  private RoomReservationService roomReservationService;
  @Autowired
  private RoomRepository roomRepository;
  @Autowired
  private RoomReservationRepository reservationRepository;
  @Autowired
  private ScheduleRepository scheduleRepository;
  @Autowired
  private UserRepository userRepository;
  @Autowired
  private PositionRepository positionRepository;
  @Autowired
  private TeamRepository teamRepository;
  @MockitoBean
  private ScheduleModificationService scheduleModificationService;

  private Long ownerId;
  private Long reservationId;
  private Long scheduleId;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    RoomUserFixture.deleteAll(userRepository,positionRepository,teamRepository);
    Room room = roomRepository.save(Room.of(1L,"Orchid",4L,"3F"));
    ownerId = RoomUserFixture.createActiveUsers(userRepository,positionRepository,teamRepository,1)
        .get(0);
    Schedule schedule = scheduleRepository.save(RoomReservationScheduleFixture.schedule("Planning",
        START,END,ownerId,List.of(ownerId),"Discuss roadmap","Orchid"));
    scheduleId = schedule.getId();
    reservationId = reservationRepository.save(
        RoomReservation.of(null,room,scheduleId,"Planning",START,END,ReservationStatus.RESERVED))
        .getId();
  }

  @Test
  void rollsBackScheduleStateWhenConnectedScheduleCancellationFails() {
    when(scheduleModificationService.findReservationScheduleForCancellation(scheduleId))
        .thenReturn(Optional.of(new ReservationSchedule(scheduleId, ownerId)));
    doAnswer(invocation -> {
      Schedule schedule = scheduleRepository.findById(scheduleId).orElseThrow();
      schedule.cancel(ownerId,invocation.getArgument(2));
      throw new RoomReservationScheduleCancelConflictException();
    }).when(scheduleModificationService).cancelReservationSchedule(any(),any(Long.class),any());

    assertThatThrownBy(
        () -> roomReservationService.cancel(new ReservationActor(ownerId),reservationId))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_CANCEL_CONFLICT");

    RoomReservation reservation = reservationRepository.findById(reservationId).orElseThrow();
    assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.RESERVED);
    assertThat(reservation.getCancelledAt()).isNull();
    Schedule schedule = scheduleRepository.findById(scheduleId).orElseThrow();
    assertThat(schedule.getStatus()).isEqualTo(ScheduleStatus.ACTIVE);
    assertThat(schedule.getCancelledBy()).isNull();
    assertThat(schedule.getCancelledAt()).isNull();
  }
}
