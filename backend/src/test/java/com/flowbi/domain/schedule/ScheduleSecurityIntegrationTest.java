package com.flowbi.domain.schedule;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.auth.session.SessionGenerationValidationFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@AutoConfigureMockMvc
class ScheduleSecurityIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @MockitoBean
  private SessionGenerationValidationFilter sessionGenerationValidationFilter;

  @BeforeEach
  void allowTheSecurityFixtureSession() throws Exception {
    doAnswer(invocation -> {
      ((FilterChain) invocation.getArgument(2)).doFilter((ServletRequest) invocation.getArgument(0),
          (ServletResponse) invocation.getArgument(1));
      return null;
    }).when(sessionGenerationValidationFilter).doFilter(any(),any(),any());
  }

  @Test
  void rejectsAnonymousAndInactiveActors() throws Exception {
    insertUser(9101L,9191L,"INACTIVE","inactive-security");

    mockMvc.perform(get("/api/schedules").param("from","2026-08-01T00:00:00+09:00").param("to",
        "2026-09-01T00:00:00+09:00")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(get("/api/schedules").with(user(principal(9101L))).session(authenticatedSession())
            .param("from","2026-08-01T00:00:00+09:00").param("to","2026-09-01T00:00:00+09:00"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("SCHEDULE_ACTOR_INACTIVE"));
  }

  @Test
  void usesThePrincipalAsCreatorAndHidesPrivateSchedulesFromOtherUsers() throws Exception {
    insertUser(9201L,9291L,"ACTIVE","owner-security");
    insertUser(9202L,9292L,"ACTIVE","other-security");

    String location = mockMvc
        .perform(post("/api/schedules").with(user(principal(9201L))).session(authenticatedSession())
            .with(csrf()).contentType("application/json").content("""
                {
                  "title":"Principal private schedule",
                  "type":"PERSONAL",
                  "visibility":"PRIVATE",
                  "startAt":"2026-08-10T09:00:00+09:00",
                  "endAt":"2026-08-10T10:00:00+09:00",
                  "allDay":false,
                  "colorLabel":"BLUE",
                  "content":"private",
                  "location":"Desk",
                  "creatorAttends":true,
                  "participantIds":[],
                  "userTargetIds":[],
                  "teamTargetIds":[],
                  "projectTargetIds":[]
                }
                """))
        .andExpect(status().isCreated()).andReturn().getResponse().getHeader("Location");

    mockMvc.perform(get(location).with(user(principal(9202L))).session(authenticatedSession()))
        .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("SCHEDULE_NOT_FOUND"));
  }

  private LoginPrincipal principal(long userId) {
    return new LoginPrincipal(Long.toString(userId), false);
  }

  private MockHttpSession authenticatedSession() {
    MockHttpSession session = new MockHttpSession();
    return session;
  }

  private void insertUser(long userId,long teamId,String status,String employeeNumber) {
    jdbcTemplate.update("INSERT INTO positions (position_id, position_name) VALUES (?, ?)",userId,
        "Position " + userId);
    jdbcTemplate.update("INSERT INTO teams (team_id, team_name) VALUES (?, ?)",teamId,
        "Team " + teamId);
    jdbcTemplate.update("""
        INSERT INTO users (user_id, position_id, team_id, employee_number, email, name, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,userId,userId,teamId,employeeNumber,employeeNumber + "@example.test","User " + userId,
        status);
  }
}
