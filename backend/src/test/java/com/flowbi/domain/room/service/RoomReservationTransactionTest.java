package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.CreateRoomReservationCommand;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomAvailabilityQuery;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.service.ScheduleCreationService;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.repository.UserRepository;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.flowbi.test.H2SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@H2SpringBootTest
class RoomReservationTransactionTest {

  private static final LocalDateTime START = LocalDateTime.of(2026,8,10,10,0);
  private static final LocalDateTime END = LocalDateTime.of(2026,8,10,11,0);

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
  private UserRepository userRepository;
  @Autowired
  private PositionRepository positionRepository;
  @Autowired
  private TeamRepository teamRepository;
  @MockitoBean
  private ScheduleCreationService scheduleCreationService;
  @MockitoBean
  private ReservationParticipantAccessService participantAccessService;

  private ReservationActor actor;
  private List<Long> attendeeIds;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    roomRepository.deleteAll();
    scheduleRepository.deleteAll();
    RoomUserFixture.deleteAll(userRepository,positionRepository,teamRepository);
    roomRepository.save(Room.of(1L,"Orchid",4L,"3F"));
    attendeeIds = RoomUserFixture.createActiveUsers(userRepository,positionRepository,
        teamRepository,2);
    actor = new ReservationActor(attendeeIds.get(0));
    when(participantAccessService.canAttend(any(),any())).thenReturn(true);
  }

  @Test
  void rollsBackTheReservationWhenConnectedScheduleCreationFails() {
    when(scheduleCreationService.create(org.mockito.ArgumentMatchers.any()))
        .thenAnswer(invocation -> {
          scheduleRepository.save(RoomReservationScheduleFixture.schedule("Planning",START,END,
              actor.userId(),attendeeIds,"Discuss roadmap","Orchid"));
          throw new IllegalStateException("schedule persistence failed");
        });

    assertThatThrownBy(() -> roomReservationService.create(actor,command()))
        .isInstanceOf(IllegalStateException.class);

    assertThat(reservationRepository.count()).isZero();
    assertThat(scheduleRepository.count()).isZero();
  }

  @Test
  void returnsStableConflictForSamePartialAndContainingOverlapsAndAppearsInAvailability() {
    when(scheduleCreationService.create(org.mockito.ArgumentMatchers.any()))
        .thenAnswer(invocation -> {
          Schedule schedule = scheduleRepository.save(RoomReservationScheduleFixture.schedule(
              "Planning",START,END,actor.userId(),attendeeIds,"Discuss roadmap","Orchid"));
          return new ScheduleCreationService.CreatedSchedule(schedule.getId());
        });
    roomReservationService.create(actor,command());

    assertConflict(command());
    assertConflict(new CreateRoomReservationCommand(1L, "Planning", START.plusMinutes(30),
        END.plusMinutes(30), attendeeIds, "Discuss roadmap"));
    assertConflict(new CreateRoomReservationCommand(1L, "Planning", START.minusMinutes(30),
        END.plusMinutes(30), attendeeIds, "Discuss roadmap"));
    assertThat(reservationRepository.count()).isEqualTo(1L);
    assertThat(
        roomAvailabilityService.findAvailability(new RoomAvailabilityQuery(START.toLocalDate(),
            LocalTime.of(9,0), LocalTime.of(18,0), null, null)).rooms().get(0).reservations())
        .hasSize(1);
  }

  private void assertConflict(CreateRoomReservationCommand command) {
    assertThatThrownBy(() -> roomReservationService.create(actor,command))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_CONFLICT");
  }

  private CreateRoomReservationCommand command() {
    return new CreateRoomReservationCommand(1L, "Planning", START, END, attendeeIds,
        "Discuss roadmap");
  }
}
