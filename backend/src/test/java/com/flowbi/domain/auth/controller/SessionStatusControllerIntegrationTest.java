package com.flowbi.domain.auth.controller;

import static org.mockito.Mockito.doThrow;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.auth.exception.SessionGenerationStoreUnavailableException;
import com.flowbi.domain.auth.exception.SessionGenerationValidationException;
import com.flowbi.domain.auth.service.SessionGenerationService;
import com.flowbi.domain.auth.security.MustChangePasswordFilter;
import com.flowbi.domain.auth.security.AbsoluteSessionTimeoutFilter;
import com.flowbi.domain.auth.security.SessionGenerationValidationFilter;
import com.flowbi.domain.auth.security.SecurityConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = SessionStatusController.class)
@Import({SecurityConfiguration.class, AbsoluteSessionTimeoutFilter.class, CsrfTokenController.class,
    SessionGenerationValidationFilter.class, MustChangePasswordFilter.class})
class SessionStatusControllerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private SessionGenerationService sessionGenerationService;

  @Test
  void returnsOnlyAuthenticatedSessionStateForARegularSession() throws Exception {
    mockMvc.perform(authenticatedSession(new LoginPrincipal("42", false)))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.authenticated").value(true))
        .andExpect(jsonPath("$.mustChangePassword").value(false))
        .andExpect(jsonPath("$.employeeNumber").doesNotExist())
        .andExpect(jsonPath("$.password").doesNotExist())
        .andExpect(jsonPath("$.passwordHash").doesNotExist())
        .andExpect(jsonPath("$.sessionId").doesNotExist())
        .andExpect(jsonPath("$.csrfToken").doesNotExist());
  }

  @Test
  void returnsPasswordChangeRequirementWithoutBlockingSessionStatus() throws Exception {
    mockMvc.perform(authenticatedSession(new LoginPrincipal("42", true))).andExpect(status().isOk())
        .andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.authenticated").value(true))
        .andExpect(jsonPath("$.mustChangePassword").value(true));
  }

  @Test
  void rejectsAnonymousOrExpiredSessionsAsUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/auth/session")).andExpect(status().isUnauthorized())
        .andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
  }

  @Test
  void rejectsGenerationMismatchAsUnauthenticated() throws Exception {
    doThrow(new SessionGenerationValidationException()).when(sessionGenerationService)
        .verify(eq("42"),eq(0L),anyString());

    mockMvc.perform(authenticatedSession(new LoginPrincipal("42", false)))
        .andExpect(status().isUnauthorized()).andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
  }

  @Test
  void failsClosedWhenTheSessionStoreIsUnavailable() throws Exception {
    doThrow(new SessionGenerationStoreUnavailableException("unavailable", null))
        .when(sessionGenerationService).verify(eq("42"),eq(0L),anyString());

    mockMvc.perform(authenticatedSession(new LoginPrincipal("42", false)))
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.code").value("AUTH_SESSION_UNAVAILABLE"))
        .andExpect(jsonPath("$.message").value("Authentication session is unavailable."));
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder authenticatedSession(
      LoginPrincipal principal) {
    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);
    return get("/api/auth/session").with(user(principal)).session(session);
  }
}
