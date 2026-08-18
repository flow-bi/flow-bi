package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.CreateRoomReservationCommand;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomAvailabilityQuery;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleStatus;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.service.ScheduleCreationService;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class RoomReservationTransactionTest {

  private static final ReservationActor ACTOR = new ReservationActor(10L);
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
  private UserRepository userRepository;
  @Autowired
  private ScheduleRepository scheduleRepository;
  @MockitoBean
  private ScheduleCreationService scheduleCreationService;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    roomRepository.deleteAll();
    scheduleRepository.deleteAll();
    userRepository.deleteAll();
    roomRepository.save(Room.of(1L,"Orchid",4L,"3F"));
    userRepository.saveAll(List.of(User.of(10L,"ACTIVE"),User.of(11L,"ACTIVE")));
  }

  @Test
  void rollsBackTheReservationWhenConnectedScheduleCreationFails() {
    when(scheduleCreationService.create(org.mockito.ArgumentMatchers.any()))
        .thenAnswer(invocation -> {
          scheduleRepository
              .save(Schedule.roomReservation("Planning",START,END,10L,ScheduleStatus.ACTIVE));
          throw new IllegalStateException("schedule persistence failed");
        });

    assertThatThrownBy(() -> roomReservationService.create(ACTOR,command()))
        .isInstanceOf(IllegalStateException.class);

    assertThat(reservationRepository.count()).isZero();
    assertThat(scheduleRepository.count()).isZero();
  }

  @Test
  void returnsStableConflictForSamePartialAndContainingOverlapsAndAppearsInAvailability() {
    when(scheduleCreationService.create(org.mockito.ArgumentMatchers.any()))
        .thenReturn(new ScheduleCreationService.CreatedSchedule(99L));
    roomReservationService.create(ACTOR,command());

    assertConflict(command());
    assertConflict(new CreateRoomReservationCommand(1L, "Planning", START.plusMinutes(30),
        END.plusMinutes(30), List.of(10L,11L), "Discuss roadmap"));
    assertConflict(new CreateRoomReservationCommand(1L, "Planning", START.minusMinutes(30),
        END.plusMinutes(30), List.of(10L,11L), "Discuss roadmap"));
    assertThat(reservationRepository.count()).isEqualTo(1L);
    assertThat(
        roomAvailabilityService.findAvailability(new RoomAvailabilityQuery(START.toLocalDate(),
            LocalTime.of(9,0), LocalTime.of(18,0), null, null)).rooms().get(0).reservations())
        .hasSize(1);
  }

  private void assertConflict(CreateRoomReservationCommand command) {
    assertThatThrownBy(() -> roomReservationService.create(ACTOR,command))
        .isInstanceOf(RoomReservationApplicationException.class)
        .extracting(error -> ((RoomReservationApplicationException) error).code())
        .isEqualTo("ROOM_RESERVATION_CONFLICT");
  }

  private CreateRoomReservationCommand command() {
    return new CreateRoomReservationCommand(1L, "Planning", START, END, List.of(10L,11L),
        "Discuss roadmap");
  }
}
