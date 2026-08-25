package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.room.dto.CreateRoomReservationCommand;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.repository.UserRepository;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.flowbi.test.PostgresSpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@PostgresSpringBootTest
class RoomReservationScheduleRollbackTest {

  private static final LocalDateTime START = LocalDateTime.of(2026,8,10,10,0);
  private static final LocalDateTime END = LocalDateTime.of(2026,8,10,11,0);

  @Autowired
  private RoomReservationService roomReservationService;
  @Autowired
  private RoomRepository roomRepository;
  @Autowired
  private ScheduleRepository scheduleRepository;
  @Autowired
  private UserRepository userRepository;
  @Autowired
  private PositionRepository positionRepository;
  @Autowired
  private TeamRepository teamRepository;
  @Autowired
  private JdbcTemplate jdbcTemplate;
  @MockitoBean
  private RoomReservationRepository reservationRepository;
  @MockitoBean
  private ReservationParticipantAccessService participantAccessService;

  private long creatorId;
  private long attendeeId;

  @BeforeEach
  void setUp() {
    jdbcTemplate.update("DELETE FROM rooms_reservations");
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    RoomUserFixture.deleteAll(userRepository,positionRepository,teamRepository);
    roomRepository.save(Room.of(1L,"Orchid",4L,"3F"));
    List<Long> userIds = RoomUserFixture.createActiveUsers(userRepository,positionRepository,
        teamRepository,2);
    creatorId = userIds.get(0);
    attendeeId = userIds.get(1);
    when(participantAccessService.canAttend(any(),any())).thenReturn(true);
    when(reservationRepository.existsReservedOverlap(1L,START,END)).thenReturn(false);
  }

  @Test
  void rollsBackTheConnectedScheduleWhenReservationPersistenceFails() {
    when(reservationRepository.save(any()))
        .thenThrow(new DataIntegrityViolationException("reservation persistence failed"));

    assertThatThrownBy(() -> roomReservationService.create(new ReservationActor(creatorId),
        new CreateRoomReservationCommand(1L, "Quarterly planning", START, END,
            List.of(creatorId,attendeeId), "Discuss the Q3 roadmap")))
        .isInstanceOf(DataIntegrityViolationException.class);

    assertThat(scheduleRepository.count()).isZero();
  }
}
