package com.flowbi.domain.team.controller;

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
import com.flowbi.domain.team.dto.TeamHierarchyResponse;
import com.flowbi.domain.team.service.TeamAdministrationService;
import com.flowbi.domain.team.service.TeamHierarchyService;
import com.flowbi.domain.team.service.TeamService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = TeamController.class)
@Import({SecurityConfiguration.class, AbsoluteSessionTimeoutFilter.class, CsrfTokenController.class,
    SessionGenerationValidationFilter.class, MustChangePasswordFilter.class})
class TeamOrganizationChartSecurityIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private SessionGenerationService generations;

  @MockBean
  private TeamService teams;

  @MockBean
  private TeamHierarchyService hierarchy;

  @MockBean
  private TeamAdministrationService administration;

  @Test
  void returnsTheOrganizationTreeForTheActualLoginPrincipal() throws Exception {
    when(hierarchy.findOrganizationTree())
        .thenReturn(List.of(new TeamHierarchyResponse(1L, "Headquarters", 0, List.of())));

    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);

    mockMvc
        .perform(
            get("/api/teams/tree").with(user(new LoginPrincipal("42", false))).session(session))
        .andExpect(status().isOk()).andExpect(jsonPath("$[0].teamId").value(1));
  }

  @Test
  void rejectsAnAnonymousOrganizationTreeRequest() throws Exception {
    mockMvc.perform(get("/api/teams/tree")).andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
  }
}
