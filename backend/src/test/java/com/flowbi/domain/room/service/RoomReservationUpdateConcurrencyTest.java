package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.dto.UpdateRoomReservationCommand;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
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
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class RoomReservationUpdateConcurrencyTest {

  private static final LocalDateTime START = LocalDateTime.of(2026,8,10,11,0);
  private static final LocalDateTime END = LocalDateTime.of(2026,8,10,12,0);

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
  private Long firstReservationId;
  private Long secondReservationId;
  private Long firstOwnerId;
  private Long secondOwnerId;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    RoomUserFixture.deleteAll(userRepository,positionRepository,teamRepository);
    roomRepository.saveAll(List.of(Room.of(1L,"Orchid",4L,"3F"),Room.of(2L,"Iris",4L,"4F"),
        Room.of(3L,"Lily",4L,"5F")));
    when(participantAccessService.canAttend(any(),any())).thenReturn(true);
    List<Long> ownerIds = RoomUserFixture.createActiveUsers(userRepository,positionRepository,
        teamRepository,2);
    firstOwnerId = ownerIds.get(0);
    secondOwnerId = ownerIds.get(1);
    firstReservationId = reservation(1L,firstOwnerId,START.minusHours(2),START.minusHours(1));
    secondReservationId = reservation(3L,secondOwnerId,START.minusHours(1),START);
    executor = Executors.newFixedThreadPool(2);
  }

  @AfterEach
  void tearDown() {
    executor.shutdownNow();
  }

  @Test
  void allowsOnlyOneConcurrentMoveToTheSameRoomAndTime() throws Exception {
    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch start = new CountDownLatch(1);
    CompletableFuture<String> first = update(ready,start,firstReservationId,firstOwnerId);
    CompletableFuture<String> second = update(ready,start,secondReservationId,secondOwnerId);

    assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();
    start.countDown();

    assertThat(List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS)))
        .containsExactlyInAnyOrder("SUCCESS","ROOM_RESERVATION_CONFLICT");
  }

  private Long reservation(long roomId,long ownerId,LocalDateTime reservationStart,
      LocalDateTime reservationEnd) {
    Long scheduleId = scheduleRepository.save(RoomReservationScheduleFixture.schedule("Old title",
        reservationStart,reservationEnd,ownerId,List.of(ownerId),"Old detail","Orchid")).getId();
    return reservationRepository
        .save(RoomReservation.of(null,roomRepository.findById(roomId).orElseThrow(),scheduleId,
            "Old title",reservationStart,reservationEnd,ReservationStatus.RESERVED))
        .getId();
  }

  private CompletableFuture<String> update(CountDownLatch ready,CountDownLatch start,
      Long reservationId,Long ownerId) {
    return CompletableFuture.supplyAsync(() -> {
      ready.countDown();
      try {
        if (!start.await(5,TimeUnit.SECONDS)) {
          return "START_TIMEOUT";
        }
        roomReservationService.update(new ReservationActor(ownerId),
            new UpdateRoomReservationCommand(reservationId, 2L, "Updated title", START, END,
                List.of(ownerId), "Updated detail"));
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
