package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.dto.UpdateRoomReservationCommand;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleStatus;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
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

  private ExecutorService executor;
  private Long firstReservationId;
  private Long secondReservationId;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    userRepository.deleteAll();
    roomRepository.saveAll(List.of(Room.of(1L,"Orchid",4L,"3F"),Room.of(2L,"Iris",4L,"4F"),
        Room.of(3L,"Lily",4L,"5F")));
    userRepository.saveAll(List.of(User.of(10L,"ACTIVE"),User.of(11L,"ACTIVE")));
    firstReservationId = reservation(1L,10L,START.minusHours(2),START.minusHours(1));
    secondReservationId = reservation(3L,11L,START.minusHours(1),START);
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
    CompletableFuture<String> first = update(ready,start,firstReservationId,10L);
    CompletableFuture<String> second = update(ready,start,secondReservationId,11L);

    assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();
    start.countDown();

    assertThat(List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS)))
        .containsExactlyInAnyOrder("SUCCESS","ROOM_RESERVATION_CONFLICT");
  }

  private Long reservation(long roomId,long ownerId,LocalDateTime reservationStart,
      LocalDateTime reservationEnd) {
    Long scheduleId = scheduleRepository.save(Schedule.roomReservation("Old title",reservationStart,
        reservationEnd,ownerId,ScheduleStatus.ACTIVE)).getId();
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
