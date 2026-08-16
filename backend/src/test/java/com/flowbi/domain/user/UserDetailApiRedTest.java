package com.flowbi.domain.user;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.auth.password.MustChangePasswordFilter;
import com.flowbi.domain.auth.session.AbsoluteSessionTimeoutFilter;
import com.flowbi.domain.auth.security.CsrfTokenController;
import com.flowbi.domain.auth.security.SecurityConfiguration;
import com.flowbi.domain.auth.session.SessionGenerationService;
import com.flowbi.domain.auth.session.SessionGenerationValidationFilter;
import com.flowbi.domain.user.controller.UserController;
import com.flowbi.domain.user.dto.UserDetailResponse;
import com.flowbi.domain.user.service.UserService;
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
class UserDetailApiRedTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private SessionGenerationService generations;

  @MockBean
  private UserService users;

  @Test
  void returnsTheMinimumUserDetailForAnAuthenticatedUser() throws Exception {
    org.mockito.Mockito.when(users.getUserDetail(7L)).thenReturn(detail());
    mockMvc.perform(request(new LoginPrincipal("42", false))).andExpect(status().isOk())
        .andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.userId").value(7)).andExpect(jsonPath("$.name").value("Kim Flow"))
        .andExpect(jsonPath("$.status").value("ACTIVE"))
        .andExpect(jsonPath("$.team.teamId").value(3))
        .andExpect(jsonPath("$.team.name").value("Platform"))
        .andExpect(jsonPath("$.position.positionId").value(2))
        .andExpect(jsonPath("$.position.name").value("Engineer"))
        .andExpect(jsonPath("$.employeeNumber").doesNotExist())
        .andExpect(jsonPath("$.password").doesNotExist())
        .andExpect(jsonPath("$.passwordHash").doesNotExist())
        .andExpect(jsonPath("$.credentialId").doesNotExist())
        .andExpect(jsonPath("$.sessionId").doesNotExist());
  }

  @Test
  void rejectsAnonymousAndPasswordChangeRequiredRequests() throws Exception {
    mockMvc.perform(get("/api/users/7")).andExpect(status().isUnauthorized());
    mockMvc.perform(request(new LoginPrincipal("42", true))).andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
  }

  @Test
  void returnsNotFoundWhenTheUserDoesNotExistOrIsNotExposed() throws Exception {
    org.mockito.Mockito.when(users.getUserDetail(9L))
        .thenThrow(new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND));

    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);
    mockMvc
        .perform(get("/api/users/9").with(user(new LoginPrincipal("42", false))).session(session))
        .andExpect(status().isNotFound()).andExpect(header().string("Cache-Control","no-store"));
  }

  private UserDetailResponse detail() {
    return new UserDetailResponse(7L, "Kim Flow", "ACTIVE",
        new UserDetailResponse.TeamDetail(3L, "Platform"),
        new UserDetailResponse.PositionDetail(2L, "Engineer"));
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request(
      LoginPrincipal principal) {
    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);
    return get("/api/users/7").with(user(principal)).session(session);
  }
}
