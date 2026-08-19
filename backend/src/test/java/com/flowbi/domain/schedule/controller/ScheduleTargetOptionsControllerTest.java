package com.flowbi.domain.schedule.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@AutoConfigureMockMvc
class ScheduleTargetOptionsControllerTest {

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
  void returnsOnlyTheAuthenticatedActorsTargetNames() throws Exception {
    insertUser(9701L,9711L,"ACTIVE");
    insertUser(9702L,9712L,"ACTIVE");
    insertProject(9721L,"Beta","ACTIVE");
    insertProject(9722L,"Alpha","ACTIVE");
    insertProject(9723L,"Archived","INACTIVE");
    jdbcTemplate.update("INSERT INTO projects_members (project_id, user_id) VALUES (9721, 9701)");
    jdbcTemplate.update("INSERT INTO projects_members (project_id, user_id) VALUES (9723, 9701)");
    jdbcTemplate.update("INSERT INTO projects_members (project_id, user_id) VALUES (9722, 9702)");

    mockMvc
        .perform(get("/api/schedules/target-options").with(user(principal(9701L)))
            .session(authenticatedSession()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.teams.length()").value(1))
        .andExpect(jsonPath("$.teams[0].id").value(9711L))
        .andExpect(jsonPath("$.teams[0].name").value("Team 9711"))
        .andExpect(jsonPath("$.projects.length()").value(1))
        .andExpect(jsonPath("$.projects[0].id").value(9721L))
        .andExpect(jsonPath("$.projects[0].name").value("Beta"))
        .andExpect(jsonPath("$.teams[0].status").doesNotExist())
        .andExpect(jsonPath("$.projects[0].members").doesNotExist());
  }

  @Test
  void rejectsAnonymousAndInactiveActorsWithTheExistingSafeContracts() throws Exception {
    insertUser(9731L,9741L,"INACTIVE");

    mockMvc.perform(get("/api/schedules/target-options")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(get("/api/schedules/target-options").with(user(principal(9731L)))
            .session(authenticatedSession()))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("SCHEDULE_ACTOR_INACTIVE"));
  }

  private LoginPrincipal principal(long userId) {
    return new LoginPrincipal(Long.toString(userId), false);
  }

  private MockHttpSession authenticatedSession() {
    return new MockHttpSession();
  }

  private void insertProject(long projectId,String name,String status) {
    jdbcTemplate.update("INSERT INTO projects (project_id, project_name, status) VALUES (?, ?, ?)",
        projectId,name,status);
  }

  private void insertUser(long userId,long teamId,String status) {
    jdbcTemplate.update("INSERT INTO positions (position_id, position_name) VALUES (?, ?)",userId,
        "Position " + userId);
    jdbcTemplate.update("INSERT INTO teams (team_id, team_name) VALUES (?, ?)",teamId,
        "Team " + teamId);
    jdbcTemplate.update("""
        INSERT INTO users (user_id, position_id, team_id, employee_number, email, name, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,userId,userId,teamId,"target-options-" + userId,
        "target-options-" + userId + "@example.test","User " + userId,status);
  }
}
