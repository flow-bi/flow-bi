package com.flowbi.domain.schedule.controller;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;
import com.flowbi.domain.schedule.service.*;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

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
class ScheduleAttendeeControllerTest {

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
  void returnsOnlyMinimalActiveUserResultsInStableOrder() throws Exception {
    insertUser(9301L,"ACTIVE","search-actor","검색 사용자");
    insertUser(9302L,"ACTIVE","active-result","가나다 검색");
    insertUser(9303L,"INACTIVE","inactive-result","나가다 검색");

    mockMvc
        .perform(get("/api/schedules/attendee-candidates").with(user(principal(9301L)))
            .session(authenticatedSession()).param("query"," 검색 "))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(2))
        .andExpect(jsonPath("$.data[0].userId").value(9302L))
        .andExpect(jsonPath("$.data[0].displayName").value("가나다 검색"))
        .andExpect(jsonPath("$.data[0].employeeNumber").doesNotExist());
  }

  @Test
  void rejectsBlankAndOverlongQueries() throws Exception {
    insertUser(9401L,"ACTIVE","query-actor","Query Actor");

    mockMvc
        .perform(get("/api/schedules/attendee-candidates").with(user(principal(9401L)))
            .session(authenticatedSession()).param("query","   "))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_ATTENDEE_QUERY"));
    mockMvc
        .perform(get("/api/schedules/attendee-candidates").with(user(principal(9401L)))
            .session(authenticatedSession()).param("query","x".repeat(51)))
        .andExpect(status().isBadRequest());
  }

  private LoginPrincipal principal(long userId) {
    return new LoginPrincipal(Long.toString(userId), false);
  }

  private MockHttpSession authenticatedSession() {
    MockHttpSession session = new MockHttpSession();
    return session;
  }

  private void insertUser(long userId,String status,String employeeNumber,String name) {
    long teamId = userId + 100;
    jdbcTemplate.update("INSERT INTO positions (position_id, position_name) VALUES (?, ?)",userId,
        "Position " + userId);
    jdbcTemplate.update("INSERT INTO teams (team_id, team_name) VALUES (?, ?)",teamId,
        "Team " + teamId);
    jdbcTemplate.update("""
        INSERT INTO users (user_id, position_id, team_id, employee_number, email, name, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,userId,userId,teamId,employeeNumber,employeeNumber + "@example.test",name,status);
  }
}
