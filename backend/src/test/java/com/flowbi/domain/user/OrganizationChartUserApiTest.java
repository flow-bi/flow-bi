package com.flowbi.domain.user;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.password.MustChangePasswordFilter;
import com.flowbi.domain.auth.security.CsrfTokenController;
import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.auth.security.SecurityConfiguration;
import com.flowbi.domain.auth.session.AbsoluteSessionTimeoutFilter;
import com.flowbi.domain.auth.session.SessionGenerationService;
import com.flowbi.domain.auth.session.SessionGenerationValidationFilter;
import com.flowbi.domain.user.controller.UserController;
import com.flowbi.domain.user.dto.OrganizationChartUserDetailResponse;
import com.flowbi.domain.user.dto.OrganizationChartUserListResponse;
import com.flowbi.domain.user.entity.WorkStatus;
import com.flowbi.domain.user.service.UserService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = UserController.class)
@Import({SecurityConfiguration.class, AbsoluteSessionTimeoutFilter.class, CsrfTokenController.class,
    SessionGenerationValidationFilter.class, MustChangePasswordFilter.class})
class OrganizationChartUserApiTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private SessionGenerationService generations;

  @MockBean
  private UserService users;

  @Test
  void returnsOnlySortedOrganizationChartEmployeesIncludingInactiveAccounts() throws Exception {
    when(users.getOrganizationChartUsers(3L)).thenReturn(List.of(
        new OrganizationChartUserListResponse(2L, "Ahn", "Engineer", "INACTIVE", WorkStatus.OFFLINE,
            null),
        new OrganizationChartUserListResponse(7L, "Kim", "Manager", "ACTIVE", WorkStatus.WORKING,
            "https://images.example.test/7")));

    mockMvc.perform(authenticated(get("/api/users").param("teamId","3"))).andExpect(status().isOk())
        .andExpect(jsonPath("$[0].userId").value(2))
        .andExpect(jsonPath("$[0].accountStatus").value("INACTIVE"))
        .andExpect(jsonPath("$[0].workStatus").value("OFFLINE"))
        .andExpect(jsonPath("$[1].profileImageUrl").value("https://images.example.test/7"))
        .andExpect(jsonPath("$[0].employeeNumber").doesNotExist())
        .andExpect(jsonPath("$[0].email").doesNotExist())
        .andExpect(jsonPath("$[0].phoneNumber").doesNotExist())
        .andExpect(jsonPath("$[0].roles").doesNotExist());
  }

  @Test
  void returnsAnEmptyArrayForAnExistingTeamWithoutEmployeesAndNotFoundForMissingTeam()
      throws Exception {
    when(users.getOrganizationChartUsers(4L)).thenReturn(List.of());
    when(users.getOrganizationChartUsers(99L))
        .thenThrow(new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND));

    mockMvc.perform(authenticated(get("/api/users").param("teamId","4"))).andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());
    mockMvc.perform(authenticated(get("/api/users").param("teamId","99")))
        .andExpect(status().isNotFound());
  }

  @Test
  void returnsTheOrganizationChartDetailWithoutAuthenticationOrUnrequestedPersonalData()
      throws Exception {
    when(users.getOrganizationChartUserDetail(7L))
        .thenReturn(new OrganizationChartUserDetailResponse("https://images.example.test/7", "Kim",
            "Manager", "Platform", "1234", "kim@example.test", "ACTIVE", WorkStatus.IN_MEETING));

    mockMvc.perform(authenticated(get("/api/users/7"))).andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Kim"))
        .andExpect(jsonPath("$.accountStatus").value("ACTIVE"))
        .andExpect(jsonPath("$.workStatus").value("IN_MEETING"))
        .andExpect(jsonPath("$.employeeNumber").doesNotExist())
        .andExpect(jsonPath("$.passwordHash").doesNotExist())
        .andExpect(jsonPath("$.roles").doesNotExist())
        .andExpect(jsonPath("$.sessionId").doesNotExist());
  }

  @Test
  void rejectsUnauthenticatedOrganizationChartRequests() throws Exception {
    mockMvc.perform(get("/api/users").param("teamId","3")).andExpect(status().isUnauthorized());
    mockMvc.perform(get("/api/users/7")).andExpect(status().isUnauthorized());
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder authenticated(
      org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request) {
    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);
    return request.with(user(new LoginPrincipal("42", false))).session(session);
  }
}
