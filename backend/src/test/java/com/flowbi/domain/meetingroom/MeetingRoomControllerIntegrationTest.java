package com.flowbi.domain.meetingroom;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.common.security.JwtProvider;
import com.flowbi.domain.meetingroom.entity.Room;
import com.flowbi.domain.meetingroom.repository.RoomRepository;
import com.flowbi.domain.meetingroom.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.repository.ScheduleDetailRepository;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.repository.ScheduleTargetRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class MeetingRoomControllerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private JwtProvider jwtProvider;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private RoomRepository roomRepository;

  @Autowired
  private RoomReservationRepository reservationRepository;

  @Autowired
  private ScheduleTargetRepository targetRepository;

  @Autowired
  private ScheduleDetailRepository detailRepository;

  @Autowired
  private ScheduleRepository scheduleRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  private Room room;
  private String accessToken;
  private String otherAccessToken;

  @BeforeEach
  void setUp() {
    reservationRepository.deleteAll();
    targetRepository.deleteAll();
    detailRepository.deleteAll();
    scheduleRepository.deleteAll();
    roomRepository.deleteAll();
    userRepository.deleteAll();

    jdbcTemplate.update("DELETE FROM teams");
    jdbcTemplate.update("INSERT INTO teams (team_id, team_name) VALUES (?, ?)",10L,"플랫폼팀");
    User user = userRepository.save(new User(1L, 10L, "EMP001", "홍길동"));
    User otherUser = userRepository.save(new User(1L, 10L, "EMP002", "김동료"));
    accessToken = jwtProvider.createAccessToken(user.getUserId(),user.getEmployeeNumber());
    otherAccessToken = jwtProvider.createAccessToken(otherUser.getUserId(),
        otherUser.getEmployeeNumber());
    room = roomRepository.save(new Room("대회의실", 20L, "본관 5층", "빔프로젝터"));
  }

  @Test
  void createsReservationAndLinkedSchedule() throws Exception {
    mockMvc
        .perform(post("/api/v1/rooms/{roomId}/reservations",room.getRoomId())
            .header(HttpHeaders.AUTHORIZATION,"Bearer " + accessToken)
            .contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "title": "기획 회의",
                  "start_at": "2026-07-05T09:00:00",
                  "end_at": "2026-07-05T10:00:00",
                  "count": 5,
                  "field": "분기 목표 논의",
                  "schedule_type": "TEAM",
                  "visibility": "PRIVATE",
                  "color_label": "파랑",
                  "targets": []
                }
                """))
        .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.status").value("RESERVED"))
        .andExpect(jsonPath("$.data.schedule_id").isNumber());

    mockMvc
        .perform(get("/api/v1/schedules?view=day&date=2026-07-05").header(HttpHeaders.AUTHORIZATION,
            "Bearer " + accessToken))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1))
        .andExpect(jsonPath("$.data[0].title").value("기획 회의"));
  }

  @Test
  void rejectsOverlappingReservation() throws Exception {
    createReservation("기획 회의","2026-07-05T09:00:00","2026-07-05T10:00:00");

    mockMvc
        .perform(post("/api/v1/rooms/{roomId}/reservations",room.getRoomId())
            .header(HttpHeaders.AUTHORIZATION,"Bearer " + accessToken)
            .contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "title": "겹치는 회의",
                  "start_at": "2026-07-05T09:30:00",
                  "end_at": "2026-07-05T10:30:00"
                }
                """))
        .andExpect(status().isConflict()).andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.error.code").value("MEETINGROOM_003"));
  }

  @Test
  void rejectsConcurrentOverlappingReservation() throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    Callable<Integer> request = () -> mockMvc
        .perform(post("/api/v1/rooms/{roomId}/reservations",room.getRoomId())
            .header(HttpHeaders.AUTHORIZATION,"Bearer " + accessToken)
            .contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "title": "동시 회의",
                  "start_at": "2026-07-05T09:00:00",
                  "end_at": "2026-07-05T10:00:00",
                  "schedule_type": "TEAM",
                  "visibility": "PRIVATE",
                  "color_label": "파랑"
                }
                """))
        .andReturn().getResponse().getStatus();

    List<Future<Integer>> results = executor.invokeAll(List.of(request,request));
    executor.shutdown();

    List<Integer> statuses = results.stream().map(result -> {
      try {
        return result.get();
      } catch (Exception exception) {
        throw new IllegalStateException(exception);
      }
    }).sorted().toList();

    org.assertj.core.api.Assertions.assertThat(statuses).containsExactly(200,409);
  }

  @Test
  void updatesReservationAndLinkedSchedule() throws Exception {
    Long reservationId = createReservation("기획 회의","2026-07-05T09:00:00","2026-07-05T10:00:00");

    mockMvc
        .perform(patch("/api/v1/rooms/reservations/{reservationId}",reservationId)
            .header(HttpHeaders.AUTHORIZATION,"Bearer " + accessToken)
            .contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "title": "수정된 회의",
                  "start_at": "2026-07-05T10:00:00",
                  "end_at": "2026-07-05T11:00:00",
                  "schedule_type": "TEAM",
                  "visibility": "PRIVATE",
                  "color_label": "초록"
                }
                """))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data.title").value("수정된 회의"));

    mockMvc
        .perform(get("/api/v1/schedules?view=day&date=2026-07-05").header(HttpHeaders.AUTHORIZATION,
            "Bearer " + accessToken))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].title").value("수정된 회의"))
        .andExpect(jsonPath("$.data[0].start_at").value("2026-07-05T10:00:00"));
  }

  @Test
  void cancelsReservationAndDeletesLinkedSchedule() throws Exception {
    Long reservationId = createReservation("기획 회의","2026-07-05T09:00:00","2026-07-05T10:00:00");

    mockMvc
        .perform(delete("/api/v1/rooms/reservations/{reservationId}",reservationId)
            .header(HttpHeaders.AUTHORIZATION,"Bearer " + accessToken))
        .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));

    mockMvc
        .perform(get("/api/v1/schedules?view=day&date=2026-07-05").header(HttpHeaders.AUTHORIZATION,
            "Bearer " + accessToken))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(0));
  }

  @Test
  void rejectsReservationUpdateByNonCreator() throws Exception {
    Long reservationId = createReservation("기획 회의","2026-07-05T09:00:00","2026-07-05T10:00:00");

    mockMvc
        .perform(patch("/api/v1/rooms/reservations/{reservationId}",reservationId)
            .header(HttpHeaders.AUTHORIZATION,"Bearer " + otherAccessToken)
            .contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "title": "권한 없는 수정",
                  "start_at": "2026-07-05T10:00:00",
                  "end_at": "2026-07-05T11:00:00",
                  "schedule_type": "TEAM",
                  "visibility": "PRIVATE",
                  "color_label": "초록"
                }
                """))
        .andExpect(status().isForbidden()).andExpect(jsonPath("$.success").value(false));
  }

  @Test
  void rejectsReservationCancelByNonCreator() throws Exception {
    Long reservationId = createReservation("기획 회의","2026-07-05T09:00:00","2026-07-05T10:00:00");

    mockMvc
        .perform(delete("/api/v1/rooms/reservations/{reservationId}",reservationId)
            .header(HttpHeaders.AUTHORIZATION,"Bearer " + otherAccessToken))
        .andExpect(status().isForbidden()).andExpect(jsonPath("$.success").value(false));
  }

  @Test
  void findsReservationsWithTeamName() throws Exception {
    createReservation("기획 회의","2026-07-05T09:00:00","2026-07-05T10:00:00");

    mockMvc
        .perform(get("/api/v1/rooms/{roomId}/reservations?date=2026-07-05",room.getRoomId())
            .header(HttpHeaders.AUTHORIZATION,"Bearer " + accessToken))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].team_name").value("플랫폼팀"))
        .andExpect(jsonPath("$.data[0].creator_id").isNumber())
        .andExpect(jsonPath("$.data[0].creator_name").value("홍길동"));
  }

  @Test
  void findsRoomsWithReservationsForGrid() throws Exception {
    createReservation("기획 회의","2026-07-05T09:00:00","2026-07-05T10:00:00");

    mockMvc
        .perform(get("/api/v1/rooms?date=2026-07-05").header(HttpHeaders.AUTHORIZATION,
            "Bearer " + accessToken))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].reservations.length()").value(1))
        .andExpect(jsonPath("$.data[0].reservations[0].title").value("기획 회의"));
  }

  private Long createReservation(String title,String startAt,String endAt) throws Exception {
    String response = mockMvc
        .perform(post("/api/v1/rooms/{roomId}/reservations",room.getRoomId())
            .header(HttpHeaders.AUTHORIZATION,"Bearer " + accessToken)
            .contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "title": "%s",
                  "start_at": "%s",
                  "end_at": "%s",
                  "schedule_type": "TEAM",
                  "visibility": "PRIVATE",
                  "color_label": "파랑"
                }
                """.formatted(title,startAt,endAt)))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    return Long.valueOf(response.replaceAll("(?s).*\\\"reservation_id\\\":(\\d+).*","$1"));
  }
}
