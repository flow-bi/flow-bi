package com.flowbi.domain.schedule;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.common.security.JwtProvider;
import com.flowbi.domain.schedule.entity.Schedule;
import com.flowbi.domain.schedule.entity.ScheduleTarget;
import com.flowbi.domain.schedule.entity.ScheduleTargetType;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import com.flowbi.domain.schedule.repository.ScheduleRepository;
import com.flowbi.domain.schedule.repository.ScheduleTargetRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
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
class ScheduleControllerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private JwtProvider jwtProvider;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private ScheduleRepository scheduleRepository;

  @Autowired
  private ScheduleTargetRepository targetRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  private User loginUser;
  private User otherUser;
  private String accessToken;

  @BeforeEach
  void setUp() {
    targetRepository.deleteAll();
    scheduleRepository.deleteAll();
    jdbcTemplate.update("DELETE FROM projects_members");
    jdbcTemplate.update("DELETE FROM projects");
    jdbcTemplate.update("DELETE FROM teams_closure");
    userRepository.deleteAll();

    loginUser = userRepository.save(new User(1L, 10L, "EMP001", "홍길동"));
    otherUser = userRepository.save(new User(1L, 20L, "EMP002", "김동료"));
    accessToken = jwtProvider.createAccessToken(loginUser.getUserId(),
        loginUser.getEmployeeNumber());
  }

  @Test
  void createsScheduleWithColorTypeAndVisibility() throws Exception {
    mockMvc
        .perform(post("/api/v1/schedules").header(HttpHeaders.AUTHORIZATION,"Bearer " + accessToken)
            .contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "title": "주간 회의",
                  "schedule_type": "TEAM",
                  "visibility": "PRIVATE",
                  "start_at": "2026-07-05T09:00:00",
                  "end_at": "2026-07-05T10:00:00",
                  "color_label": "파랑",
                  "location": "본관",
                  "content": "주간 업무 공유",
                  "targets": []
                }
                """))
        .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.title").value("주간 회의"))
        .andExpect(jsonPath("$.data.schedule_type").value("TEAM"))
        .andExpect(jsonPath("$.data.visibility").value("PRIVATE"))
        .andExpect(jsonPath("$.data.color_label").value("파랑"));
  }

  @Test
  void findsSchedulesSharedByUserTeamAndProjectTargets() throws Exception {
    Schedule userTarget = saveSchedule("사용자 공유");
    targetRepository.save(new ScheduleTarget(userTarget.getScheduleId(), loginUser.getUserId(),
        null, null, null, ScheduleTargetType.USER));

    Schedule teamTarget = saveSchedule("팀 공유");
    jdbcTemplate.update(
        "INSERT INTO teams_closure (ancestor_team_id, descendant_team_id, depth) VALUES (?, ?, ?)",
        10L,10L,0);
    targetRepository.save(new ScheduleTarget(teamTarget.getScheduleId(), null, null, 10L, 10L,
        ScheduleTargetType.TEAM));

    Schedule projectTarget = saveSchedule("프로젝트 공유");
    jdbcTemplate.update("INSERT INTO projects (project_id, project_name) VALUES (?, ?)",100L,
        "MVP1");
    jdbcTemplate.update("INSERT INTO projects_members (project_id, user_id) VALUES (?, ?)",100L,
        loginUser.getUserId());
    targetRepository.save(new ScheduleTarget(projectTarget.getScheduleId(), null, 100L, null, null,
        ScheduleTargetType.PROJECT));

    mockMvc
        .perform(get("/api/v1/schedules?view=month&date=2026-07-05")
            .header(HttpHeaders.AUTHORIZATION,"Bearer " + accessToken))
        .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.length()").value(3));
  }

  private Schedule saveSchedule(String title) {
    return scheduleRepository.save(new Schedule(title, ScheduleType.PERSONAL,
        ScheduleVisibility.PRIVATE, LocalDateTime.of(2026,7,5,9,0), LocalDateTime.of(2026,7,5,10,0),
        otherUser.getUserId(), "파랑"));
  }
}
