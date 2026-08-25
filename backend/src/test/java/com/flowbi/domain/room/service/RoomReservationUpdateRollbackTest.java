package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.UpdateRoomReservationCommand;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.service.ScheduleModificationService;
import com.flowbi.domain.schedule.service.ScheduleModificationService.ReservationSchedule;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.repository.UserRepository;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.flowbi.test.PostgresSpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@PostgresSpringBootTest
class RoomReservationUpdateRollbackTest {

  private static final LocalDateTime OLD_START = LocalDateTime.of(2026,8,10,10,0);
  private static final LocalDateTime OLD_END = LocalDateTime.of(2026,8,10,11,0);
  private static final LocalDateTime NEW_START = LocalDateTime.of(2026,8,10,11,0);
  private static final LocalDateTime NEW_END = LocalDateTime.of(2026,8,10,12,0);

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
  @MockitoBean
  private ReservationParticipantAccessService participantAccessService;

  private Long reservationId;
  private Long scheduleId;
  private Long ownerId;
  private List<Long> attendeeIds;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    RoomUserFixture.deleteAll(userRepository,positionRepository,teamRepository);
    roomRepository.saveAll(List.of(Room.of(1L,"Orchid",4L,"3F"),Room.of(2L,"Iris",4L,"4F")));
    when(participantAccessService.canAttend(any(),any())).thenReturn(true);
    attendeeIds = RoomUserFixture.createActiveUsers(userRepository,positionRepository,
        teamRepository,2);
    ownerId = attendeeIds.get(0);
    Schedule schedule = scheduleRepository.save(RoomReservationScheduleFixture.schedule("Old title",
        OLD_START,OLD_END,ownerId,attendeeIds,"Old detail","Orchid"));
    scheduleId = schedule.getId();
    reservationId = reservationRepository
        .save(RoomReservation.of(null,roomRepository.findById(1L).orElseThrow(),scheduleId,
            "Old title",OLD_START,OLD_END,ReservationStatus.RESERVED))
        .getId();
  }

  @Test
  void rollsBackBothReservationAndScheduleWhenScheduleUpdateFails() {
    when(scheduleModificationService.findReservationSchedule(scheduleId))
        .thenReturn(Optional.of(new ReservationSchedule(scheduleId, ownerId)));
    doAnswer(invocation -> {
      scheduleRepository.findById(scheduleId).orElseThrow().update(RoomReservationScheduleFixture
          .update("Updated title",NEW_START,NEW_END,ownerId,attendeeIds,"Updated detail","Iris"));
      throw new IllegalStateException("schedule persistence failed");
    }).when(scheduleModificationService).update(any());

    assertThatThrownBy(
        () -> roomReservationService
            .update(new ReservationActor(ownerId),
                new UpdateRoomReservationCommand(reservationId, 2L, "Updated title", NEW_START,
                    NEW_END, attendeeIds, "Updated detail")))
        .isInstanceOf(IllegalStateException.class);

    RoomReservation reservation = reservationRepository.findById(reservationId).orElseThrow();
    assertThat(reservation.getRoom().getId()).isEqualTo(1L);
    assertThat(reservation.getTitle()).isEqualTo("Old title");
    assertThat(reservation.getStartAt()).isEqualTo(OLD_START);
    assertThat(scheduleRepository.findById(scheduleId).orElseThrow().getTitle())
        .isEqualTo("Old title");
  }
}
