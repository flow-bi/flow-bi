package com.flowbi.domain.team.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.dto.AuthenticatedUser;
import com.flowbi.domain.auth.dto.AuthenticatedUser.Role;
import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.team.dto.TeamHierarchyResponse;
import com.flowbi.domain.team.dto.TeamResponse;
import com.flowbi.domain.team.service.TeamAdministrationService;
import com.flowbi.domain.team.service.TeamHierarchyService;
import com.flowbi.domain.team.service.TeamService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class TeamControllerTest {

  private final TeamService teams = Mockito.mock(TeamService.class);
  private final TeamHierarchyService hierarchy = Mockito.mock(TeamHierarchyService.class);
  private final TeamAdministrationService administration = Mockito
      .mock(TeamAdministrationService.class);
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(new TeamController(teams, hierarchy, administration))
        .setControllerAdvice(new TeamApiExceptionHandler()).build();
  }

  @Test
  void allowsAuthenticatedUsersToReadTheHierarchy() throws Exception {
    when(teams.findAll()).thenReturn(List.of());
    when(hierarchy.findSubtree(1L)).thenReturn(new TeamHierarchyResponse(1L, "Root", 0, List.of()));

    mockMvc.perform(get("/api/teams").requestAttr("authenticatedUser",user()))
        .andExpect(status().isOk()).andExpect(jsonPath("$").isArray());
    mockMvc.perform(get("/api/teams/1/tree").requestAttr("authenticatedUser",user()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.depth").value(0));
  }

  @Test
  void returnsTheEntireOrganizationTreeForAuthenticatedUsersWithoutInternalData() throws Exception {
    when(hierarchy.findOrganizationTree()).thenReturn(List.of(
        new TeamHierarchyResponse(1L, "Headquarters", 0,
            List.of(new TeamHierarchyResponse(2L, "Development", 1, List.of()))),
        new TeamHierarchyResponse(3L, "Sales", 0, List.of())));

    mockMvc.perform(get("/api/teams/tree").principal(login())).andExpect(status().isOk())
        .andExpect(jsonPath("$[0].teamId").value(1))
        .andExpect(jsonPath("$[0].children[0].teamId").value(2))
        .andExpect(jsonPath("$[1].teamId").value(3))
        .andExpect(jsonPath("$[0].ancestorTeamId").doesNotExist())
        .andExpect(jsonPath("$[0].descendantTeamId").doesNotExist())
        .andExpect(jsonPath("$[0].employeeNumber").doesNotExist());
  }

  @Test
  void rejectsUnauthenticatedOrganizationTreeRequestsBeforeCallingServices() throws Exception {
    mockMvc.perform(get("/api/teams/tree")).andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

    verify(hierarchy,never()).findOrganizationTree();
  }

  @Test
  void mapsOrganizationHierarchyInconsistencyToASafeError() throws Exception {
    when(hierarchy.findOrganizationTree())
        .thenThrow(new com.flowbi.domain.team.service.TeamHierarchyInconsistentException());

    mockMvc.perform(get("/api/teams/tree").principal(login()))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.code").value("TEAM_HIERARCHY_INCONSISTENT"))
        .andExpect(jsonPath("$.message").value("The team hierarchy is unavailable."));
  }

  @Test
  void rejectsUnauthenticatedRequestsBeforeCallingServices() throws Exception {
    mockMvc.perform(get("/api/teams")).andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    mockMvc
        .perform(
            post("/api/teams").contentType("application/json").content("{\"teamName\":\"Root\"}"))
        .andExpect(status().isUnauthorized());

    verify(teams,never()).findAll();
    verify(administration,never()).create(any(),any());
  }

  @Test
  void rejectsNonAdminMutationsBeforeCallingServices() throws Exception {
    mockMvc
        .perform(post("/api/teams").requestAttr("authenticatedUser",user())
            .contentType("application/json").content("{\"teamName\":\"Root\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TEAM_ADMIN_REQUIRED"));

    verify(administration,never()).create(any(),any());
  }

  @Test
  void performsAllAdminMutationsWithDocumentedStatusCodes() throws Exception {
    when(administration.create(any(),any())).thenReturn(new TeamResponse(1L, "Root", null));
    when(administration.rename(any(),Mockito.eq(1L),any()))
        .thenReturn(new TeamResponse(1L, "Renamed", null));
    when(administration.move(any(),Mockito.eq(1L),any()))
        .thenReturn(new TeamResponse(1L, "Renamed", 2L));

    mockMvc
        .perform(post("/api/teams").requestAttr("authenticatedUser",admin())
            .contentType("application/json").content("{\"teamName\":\"Root\"}"))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.teamId").value(1));
    mockMvc
        .perform(patch("/api/teams/1/name").requestAttr("authenticatedUser",admin())
            .contentType("application/json").content("{\"teamName\":\"Renamed\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.teamName").value("Renamed"));
    mockMvc
        .perform(put("/api/teams/1/parent").requestAttr("authenticatedUser",admin())
            .contentType("application/json").content("{\"newParentTeamId\":2}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.parentTeamId").value(2));
    mockMvc.perform(delete("/api/teams/1").requestAttr("authenticatedUser",admin()))
        .andExpect(status().isNoContent());

    verify(administration).delete(any(),Mockito.eq(1L));
  }

  @Test
  void mapsInvalidBodiesToSafeBadRequestResponses() throws Exception {
    mockMvc
        .perform(post("/api/teams").requestAttr("authenticatedUser",admin())
            .contentType("application/json").content("{\"teamName\":\" \"}"))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("TEAM_INVALID"));
  }

  private AuthenticatedUser user() {
    return new AuthenticatedUser(10L, Role.USER);
  }

  private UsernamePasswordAuthenticationToken login() {
    return new UsernamePasswordAuthenticationToken(new LoginPrincipal("10", false), null,
        List.of());
  }

  private AuthenticatedUser admin() {
    return new AuthenticatedUser(1L, Role.ADMIN);
  }
}
