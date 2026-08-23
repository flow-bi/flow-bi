package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.CreateRoomReservationCommand;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.position.repository.PositionRepository;
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
class RoomReservationConcurrencyTest {

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
  private ReservationActor actor;
  private List<Long> attendeeIds;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    RoomUserFixture.deleteAll(userRepository,positionRepository,teamRepository);
    roomRepository.save(Room.of(1L,"Orchid",4L,"3F"));
    attendeeIds = RoomUserFixture.createActiveUsers(userRepository,positionRepository,
        teamRepository,2);
    actor = new ReservationActor(attendeeIds.get(0));
    when(participantAccessService.canAttend(any(),any())).thenReturn(true);
    executor = Executors.newFixedThreadPool(2);
  }

  @AfterEach
  void tearDown() {
    executor.shutdownNow();
  }

  @Test
  void allowsExactlyOneOfTwoConcurrentOverlappingReservations() throws Exception {
    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch start = new CountDownLatch(1);
    CompletableFuture<String> first = requestReservation(ready,start);
    CompletableFuture<String> second = requestReservation(ready,start);

    assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();
    start.countDown();
    List<String> outcomes = List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS));

    assertThat(outcomes).containsExactlyInAnyOrder("SUCCESS","ROOM_RESERVATION_CONFLICT");
    assertThat(reservationRepository.count()).isEqualTo(1L);
    assertThat(scheduleRepository.count()).isEqualTo(1L);
  }

  private CompletableFuture<String> requestReservation(CountDownLatch ready,CountDownLatch start) {
    return CompletableFuture.supplyAsync(() -> {
      ready.countDown();
      try {
        if (!start.await(5,TimeUnit.SECONDS)) {
          return "START_TIMEOUT";
        }
        roomReservationService.create(actor,new CreateRoomReservationCommand(1L, "Planning", START,
            END, attendeeIds, "Discuss roadmap"));
        return "SUCCESS";
      } catch (RoomReservationApplicationException exception) {
        return exception.code();
      } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        return "INTERRUPTED";
      }
    },executor);
  }
}
