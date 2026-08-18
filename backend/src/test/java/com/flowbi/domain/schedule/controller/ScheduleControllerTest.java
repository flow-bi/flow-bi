package com.flowbi.domain.schedule.controller;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;
import com.flowbi.domain.schedule.service.*;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@AutoConfigureMockMvc
class ScheduleControllerTest {

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
  void mapsInvalidPeriodsToTheStableCalendarErrorContract() throws Exception {
    insertUser(9601L);

    mockMvc
        .perform(get("/api/schedules").with(user(new LoginPrincipal("9601", false)))
            .session(new MockHttpSession()).param("from","2026-09-01T00:00:00+09:00")
            .param("to","2026-08-01T00:00:00+09:00"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_SCHEDULE_PERIOD"));
  }

  private void insertUser(long userId) {
    long teamId = userId + 100;
    jdbcTemplate.update("INSERT INTO positions (position_id, position_name) VALUES (?, ?)",userId,
        "Position " + userId);
    jdbcTemplate.update("INSERT INTO teams (team_id, team_name) VALUES (?, ?)",teamId,
        "Team " + teamId);
    jdbcTemplate.update("""
        INSERT INTO users (user_id, position_id, team_id, employee_number, email, name, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        """,userId,userId,teamId,"controller-" + userId,"controller-" + userId + "@example.test",
        "User " + userId);
  }
}
