package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomAvailabilityQuery;
import com.flowbi.domain.room.dto.UpdateRoomReservationCommand;
import com.flowbi.domain.room.entity.ReservationStatus;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.entity.RoomReservation;
import com.flowbi.domain.room.repository.RoomRepository;
import com.flowbi.domain.room.repository.RoomReservationRepository;
import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.repository.UserRepository;
import com.flowbi.domain.user.service.ReservationParticipantAccessService;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class RoomReservationUpdateTransactionTest {

  private static final LocalDateTime OLD_START = LocalDateTime.of(2026,8,10,10,0);
  private static final LocalDateTime OLD_END = LocalDateTime.of(2026,8,10,11,0);
  private static final LocalDateTime NEW_START = LocalDateTime.of(2026,8,10,11,0);
  private static final LocalDateTime NEW_END = LocalDateTime.of(2026,8,10,12,0);

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
  private ReservationParticipantAccessService participantAccessService;

  private Long reservationId;
  private Long scheduleId;
  private ReservationActor owner;
  private List<Long> originalAttendeeIds;
  private List<Long> updatedAttendeeIds;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    RoomUserFixture.deleteAll(userRepository,positionRepository,teamRepository);
    roomRepository.saveAll(List.of(Room.of(1L,"Orchid",4L,"3F"),Room.of(2L,"Iris",4L,"4F")));
    when(participantAccessService.canAttend(any(),any())).thenReturn(true);
    List<Long> userIds = RoomUserFixture.createActiveUsers(userRepository,positionRepository,
        teamRepository,3);
    owner = new ReservationActor(userIds.get(0));
    originalAttendeeIds = List.of(userIds.get(0),userIds.get(1));
    updatedAttendeeIds = List.of(userIds.get(1),userIds.get(2),userIds.get(1));
    Schedule schedule = scheduleRepository.save(RoomReservationScheduleFixture.schedule("Old title",
        OLD_START,OLD_END,owner.userId(),originalAttendeeIds,"Old detail","Orchid"));
    scheduleId = schedule.getId();
    reservationId = reservationRepository
        .save(RoomReservation.of(null,roomRepository.findById(1L).orElseThrow(),scheduleId,
            "Old title",OLD_START,OLD_END,ReservationStatus.RESERVED))
        .getId();
  }

  @Test
  void updatesReservationAndScheduleTogetherAndAvailabilityShowsTheNewReservation() {
    var result = roomReservationService.update(owner,new UpdateRoomReservationCommand(reservationId,
        2L, "Updated title", NEW_START, NEW_END, updatedAttendeeIds, "Updated detail"));

    assertThat(result.reservationId()).isEqualTo(reservationId);
    assertThat(result.scheduleId()).isEqualTo(scheduleId);
    RoomReservation reservation = reservationRepository.findById(reservationId).orElseThrow();
    assertThat(reservation.getRoom().getId()).isEqualTo(2L);
    assertThat(reservation.getTitle()).isEqualTo("Updated title");
    assertThat(reservation.getStartAt()).isEqualTo(NEW_START);
    assertThat(reservation.getEndAt()).isEqualTo(NEW_END);
    Schedule schedule = scheduleRepository.findActiveByIdWithAssociations(scheduleId).orElseThrow();
    assertThat(schedule.getTitle()).isEqualTo("Updated title");
    assertThat(schedule.getStartAt().toLocalDateTime()).isEqualTo(NEW_START);
    assertThat(schedule.getEndAt().toLocalDateTime()).isEqualTo(NEW_END);
    assertThat(schedule.getDetail().getContent()).isEqualTo("Updated detail");
    assertThat(schedule.getDetail().getLocation()).isEqualTo("Iris");
    assertThat(schedule.getParticipants()).extracting(participant -> participant.getUserId())
        .containsExactlyInAnyOrder(updatedAttendeeIds.get(0),updatedAttendeeIds.get(1));
    assertThat(roomAvailabilityService
        .findAvailability(new RoomAvailabilityQuery(NEW_START.toLocalDate(), LocalTime.of(9,0),
            LocalTime.of(18,0), null, null))
        .rooms().stream().filter(room -> room.id().equals(2L)).findFirst().orElseThrow()
        .reservations()).extracting(reservationSummary -> reservationSummary.id())
        .containsExactly(reservationId);
  }
}
