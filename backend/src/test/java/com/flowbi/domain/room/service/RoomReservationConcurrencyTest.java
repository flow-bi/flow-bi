package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.room.dto.CreateRoomReservationCommand;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
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
class RoomReservationConcurrencyTest {

  private static final ReservationActor ACTOR = new ReservationActor(10L);
  private static final LocalDateTime START = LocalDateTime.of(2026,8,10,10,0);
  private static final LocalDateTime END = LocalDateTime.of(2026,8,10,11,0);

  @Autowired
  private RoomReservationService roomReservationService;
  @Autowired
  private RoomRepository roomRepository;
  @Autowired
  private RoomReservationRepository reservationRepository;
  @Autowired
  private UserRepository userRepository;
  @Autowired
  private ScheduleRepository scheduleRepository;

  private ExecutorService executor;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    roomRepository.deleteAll();
    userRepository.deleteAll();
    roomRepository.save(Room.of(1L,"Orchid",4L,"3F"));
    userRepository.saveAll(List.of(User.of(10L,"ACTIVE"),User.of(11L,"ACTIVE")));
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
        roomReservationService.create(ACTOR,new CreateRoomReservationCommand(1L, "Planning", START,
            END, List.of(10L,11L), "Discuss roadmap"));
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
