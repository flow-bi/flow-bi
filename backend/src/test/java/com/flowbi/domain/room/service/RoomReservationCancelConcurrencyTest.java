package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.room.dto.CreateRoomReservationCommand;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.entity.ScheduleStatus;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.repository.UserRepository;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.flowbi.test.H2SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@H2SpringBootTest
class RoomReservationCancelConcurrencyTest {

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
  private ReservationParticipantAccessService participantAccessService;

  private ExecutorService executor;
  private ReservationActor owner;
  private Long reservationId;
  private Long scheduleId;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    RoomUserFixture.deleteAll(userRepository,positionRepository,teamRepository);
    roomRepository.save(Room.of(1L,"Orchid",4L,"3F"));
    Long ownerId = RoomUserFixture
        .createActiveUsers(userRepository,positionRepository,teamRepository,1).get(0);
    owner = new ReservationActor(ownerId);
    when(participantAccessService.canAttend(any(),any())).thenReturn(true);
    var created = roomReservationService.create(owner,new CreateRoomReservationCommand(1L,
        "Planning", START, END, List.of(ownerId), "Discuss roadmap"));
    reservationId = created.reservationId();
    scheduleId = created.scheduleId();
    executor = Executors.newFixedThreadPool(2);
  }

  @AfterEach
  void tearDown() {
    executor.shutdownNow();
  }

  @Test
  void convergesTwoConcurrentCancellationsToOneCanceledState() throws Exception {
    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch start = new CountDownLatch(1);
    CompletableFuture<String> first = cancel(ready,start);
    CompletableFuture<String> second = cancel(ready,start);

    assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();
    start.countDown();

    assertThat(List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS)))
        .containsOnly("SUCCESS");
    var reservation = reservationRepository.findById(reservationId).orElseThrow();
    assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELED);
    assertThat(reservation.getCancelledAt()).isNotNull();
    var schedule = scheduleRepository.findById(scheduleId).orElseThrow();
    assertThat(schedule.getStatus()).isEqualTo(ScheduleStatus.CANCELED);
    assertThat(schedule.getCancelledBy()).isEqualTo(owner.userId());
    assertThat(schedule.getCancelledAt()).isNotNull();
  }

  private CompletableFuture<String> cancel(CountDownLatch ready,CountDownLatch start) {
    return CompletableFuture.supplyAsync(() -> {
      ready.countDown();
      try {
        if (!start.await(5,TimeUnit.SECONDS)) {
          return "START_TIMEOUT";
        }
        roomReservationService.cancel(owner,reservationId);
        return "SUCCESS";
      } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        return "INTERRUPTED";
      } catch (RuntimeException exception) {
        return exception.getClass().getSimpleName();
      }
    },executor);
  }
}
