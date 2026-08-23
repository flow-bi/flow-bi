package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.room.dto.CreateRoomReservationCommand;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomAvailabilityQuery;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.dto.ScheduleQuery;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleStatus;
import com.flowbi.domain.schedule.exception.ScheduleNotFoundException;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.service.ScheduleDetailService;
import com.flowbi.domain.schedule.service.ScheduleQueryService;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.repository.UserRepository;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.flowbi.test.H2SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@H2SpringBootTest
class RoomReservationCancelTransactionTest {

  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
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
  private ScheduleQueryService scheduleQueryService;
  @Autowired
  private ScheduleDetailService scheduleDetailService;
  @Autowired
  private RoomAvailabilityService roomAvailabilityService;
  @Autowired
  private UserRepository userRepository;
  @Autowired
  private PositionRepository positionRepository;
  @Autowired
  private TeamRepository teamRepository;
  @Autowired
  private JdbcTemplate jdbcTemplate;
  @MockitoBean
  private ReservationParticipantAccessService participantAccessService;

  private long ownerId;
  private long attendeeId;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    RoomUserFixture.deleteAll(userRepository,positionRepository,teamRepository);
    roomRepository.save(Room.of(1L,"Orchid",4L,"3F"));
    List<Long> userIds = RoomUserFixture.createActiveUsers(userRepository,positionRepository,
        teamRepository,2);
    ownerId = userIds.get(0);
    attendeeId = userIds.get(1);
    when(participantAccessService.canAttend(any(),any())).thenReturn(true);
  }

  @Test
  void cancelsReservationAndScheduleAndExcludesBothFromDefaultQueries() {
    var created = roomReservationService.create(new ReservationActor(ownerId),command());

    roomReservationService.cancel(new ReservationActor(ownerId),created.reservationId());

    var reservation = reservationRepository.findById(created.reservationId()).orElseThrow();
    assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELED);
    assertThat(reservation.getCancelledAt()).isNotNull();
    Schedule schedule = scheduleRepository.findById(created.scheduleId()).orElseThrow();
    assertThat(schedule.getStatus()).isEqualTo(ScheduleStatus.CANCELED);
    assertThat(schedule.getCancelledBy()).isEqualTo(ownerId);
    assertThat(schedule.getCancelledAt()).isNotNull();
    assertThat(scheduleQueryService.query(
        ScheduleQuery.of(attendeeId,START.minusHours(1).atZone(KOREA_ZONE).toOffsetDateTime(),
            END.plusHours(1).atZone(KOREA_ZONE).toOffsetDateTime())))
        .isEmpty();
    assertThatThrownBy(() -> scheduleDetailService.find(attendeeId,created.scheduleId()))
        .isInstanceOf(ScheduleNotFoundException.class);
    assertThat(roomAvailabilityService
        .findAvailability(new RoomAvailabilityQuery(START.toLocalDate(), START.toLocalTime(),
            END.toLocalTime(), null, null),ownerId)
        .rooms().get(0).reservations()).isEmpty();

    var replacement = roomReservationService.create(new ReservationActor(ownerId),command());

    assertThat(replacement.reservationId()).isNotEqualTo(created.reservationId());
  }

  @Test
  void keepsTheReservationActiveWhenItsConnectedScheduleWasAlreadyCanceled() {
    var created = roomReservationService.create(new ReservationActor(ownerId),command());
    jdbcTemplate.update(
        "UPDATE schedules SET status = 'CANCELED', cancelled_by = ?, "
            + "cancelled_at = ? WHERE schedule_id = ?",
        ownerId,START.atZone(KOREA_ZONE).toOffsetDateTime(),created.scheduleId());

    assertThatThrownBy(
        () -> roomReservationService.cancel(new ReservationActor(ownerId),created.reservationId()))
        .isInstanceOf(com.flowbi.domain.room.dto.RoomReservationApplicationException.class)
        .extracting(
            error -> ((com.flowbi.domain.room.dto.RoomReservationApplicationException) error)
                .code())
        .isEqualTo("ROOM_RESERVATION_CANCEL_CONFLICT");

    var reservation = reservationRepository.findById(created.reservationId()).orElseThrow();
    assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.RESERVED);
    assertThat(reservation.getCancelledAt()).isNull();
  }

  private CreateRoomReservationCommand command() {
    return new CreateRoomReservationCommand(1L, "Quarterly planning", START, END,
        List.of(ownerId,attendeeId), "Discuss roadmap");
  }
}
