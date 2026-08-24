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
import com.flowbi.domain.schedule.dto.ScheduleDetailResponse;
import com.flowbi.domain.schedule.dto.ScheduleListItem;
import com.flowbi.domain.schedule.dto.ScheduleQuery;
import com.flowbi.domain.schedule.dto.ScheduleUpdateCommand;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleColorLabel;
import com.flowbi.domain.schedule.entity.ScheduleStatus;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import com.flowbi.domain.schedule.exception.RoomReservationManagedScheduleException;
import com.flowbi.domain.schedule.exception.ScheduleNotFoundException;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.service.ScheduleCancelService;
import com.flowbi.domain.schedule.service.ScheduleDetailService;
import com.flowbi.domain.schedule.service.ScheduleQueryService;
import com.flowbi.domain.schedule.service.ScheduleUpdateService;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.repository.UserRepository;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {"spring.datasource.driver-class-name=org.postgresql.Driver",
    "spring.jpa.hibernate.ddl-auto=validate",
    "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect"})
class RoomReservationScheduleIntegrationTest {

  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
  private static final LocalDateTime START = LocalDateTime.of(2026,8,10,10,0);
  private static final LocalDateTime END = LocalDateTime.of(2026,8,10,11,0);

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url",POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username",POSTGRES::getUsername);
    registry.add("spring.datasource.password",POSTGRES::getPassword);
  }

  @Autowired
  private RoomReservationService roomReservationService;
  @Autowired
  private ScheduleQueryService scheduleQueryService;
  @Autowired
  private ScheduleDetailService scheduleDetailService;
  @Autowired
  private ScheduleUpdateService scheduleUpdateService;
  @Autowired
  private ScheduleCancelService scheduleCancelService;
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
  private ReservationParticipantAccessService participantAccessService;

  private long creatorId;
  private long attendeeId;
  private long outsiderId;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    roomRepository.deleteAll();
    scheduleRepository.deleteAll();
    RoomUserFixture.deleteAll(userRepository,positionRepository,teamRepository);
    roomRepository.save(Room.of(1L,"Orchid",4L,"3F"));
    List<Long> userIds = RoomUserFixture.createActiveUsers(userRepository,positionRepository,
        teamRepository,3);
    creatorId = userIds.get(0);
    attendeeId = userIds.get(1);
    outsiderId = userIds.get(2);
    when(participantAccessService.canAttend(any(),any())).thenReturn(true);
  }

  @Test
  void createsOnePrivateActiveScheduleVisibleOnlyToReservationParticipants() {
    var result = roomReservationService.create(new ReservationActor(creatorId),command());

    Schedule schedule = scheduleRepository.findById(result.scheduleId()).orElseThrow();
    assertThat(schedule.getStatus()).isEqualTo(ScheduleStatus.ACTIVE);
    assertThat(schedule.getType()).isEqualTo(ScheduleType.PERSONAL);
    assertThat(schedule.getVisibility()).isEqualTo(ScheduleVisibility.PRIVATE);
    assertThat(reservationRepository.findById(result.reservationId())).get()
        .extracting(reservation -> reservation.getScheduleId()).isEqualTo(result.scheduleId());

    assertThat(query(creatorId)).extracting(ScheduleListItem::id)
        .containsExactly(result.scheduleId());
    assertThat(query(attendeeId)).extracting(ScheduleListItem::id)
        .containsExactly(result.scheduleId());
    assertThat(query(outsiderId)).isEmpty();

    ScheduleDetailResponse detail = scheduleDetailService.find(attendeeId,result.scheduleId());
    assertThat(detail.title()).isEqualTo("Quarterly planning");
    assertThat(detail.startAt()).isEqualTo(atKorea(START));
    assertThat(detail.endAt()).isEqualTo(atKorea(END));
    assertThat(detail.location()).isEqualTo("Orchid");
    assertThat(detail.content()).isEqualTo("Discuss the Q3 roadmap");
    assertThat(detail.creatorAttends()).isTrue();
    assertThat(detail.participantIds()).containsExactly(attendeeId);
    assertThat(detail.meetingRoomManaged()).isTrue();
    assertThat(detail.canManage()).isFalse();
    assertThatThrownBy(() -> scheduleDetailService.find(outsiderId,result.scheduleId()))
        .isInstanceOf(ScheduleNotFoundException.class);
  }

  @Test
  void blocksCalendarUpdatesAndCancellationsForTheConnectedReservationSchedule() {
    var result = roomReservationService.create(new ReservationActor(creatorId),command());

    assertThatThrownBy(
        () -> scheduleUpdateService.update(creatorId,result.scheduleId(),updateCommand()))
        .isInstanceOf(RoomReservationManagedScheduleException.class);
    assertThatThrownBy(() -> scheduleCancelService.cancel(creatorId,result.scheduleId()))
        .isInstanceOf(RoomReservationManagedScheduleException.class);

    assertThat(scheduleRepository.findById(result.scheduleId())).get()
        .extracting(Schedule::getStatus,Schedule::getTitle)
        .containsExactly(ScheduleStatus.ACTIVE,"Quarterly planning");
  }

  private List<ScheduleListItem> query(long actorId) {
    return scheduleQueryService
        .query(ScheduleQuery.of(actorId,atKorea(START.minusHours(1)),atKorea(END.plusHours(1))));
  }

  private OffsetDateTime atKorea(LocalDateTime value) {
    return value.atZone(KOREA_ZONE).toOffsetDateTime();
  }

  private CreateRoomReservationCommand command() {
    return new CreateRoomReservationCommand(1L, "Quarterly planning", START, END,
        List.of(creatorId,attendeeId), "Discuss the Q3 roadmap");
  }

  private ScheduleUpdateCommand updateCommand() {
    return ScheduleUpdateCommand.of("Changed from calendar",ScheduleType.PERSONAL,
        ScheduleVisibility.PRIVATE,atKorea(START),atKorea(END),false,ScheduleColorLabel.BLUE,
        "Updated through calendar","Orchid",true,List.of(attendeeId),List.of(),List.of(),List.of());
  }
}
