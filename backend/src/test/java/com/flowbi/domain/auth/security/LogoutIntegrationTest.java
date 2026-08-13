package com.flowbi.domain.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.audit.LogoutAuditLogger;
import com.flowbi.domain.auth.controller.CsrfTokenController;
import com.flowbi.domain.auth.service.SessionGenerationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = LogoutTestController.class)
@Import({SecurityConfiguration.class, AbsoluteSessionTimeoutFilter.class, CsrfTokenController.class,
    SessionGenerationValidationFilter.class, MustChangePasswordFilter.class, LogoutHandler.class,
    LogoutSuccessHandler.class})
class LogoutIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private SessionGenerationService generations;

  @MockBean
  private LogoutAuditLogger auditLogger;

  @Test
  void logsOutOnlyTheCurrentSessionAndExpiresTheSessionCookie() throws Exception {
    MockHttpSession currentSession = authenticatedSession();
    MockHttpSession otherSession = authenticatedSession();

    mockMvc
        .perform(post("/api/auth/logout")
            .with(user(new LoginPrincipal("42", false))).session(currentSession).with(csrf()))
        .andExpect(status().isNoContent())
        .andExpect(header().string("Set-Cookie",
            org.hamcrest.Matchers.allOf(org.hamcrest.Matchers.containsString("SESSION="),
                org.hamcrest.Matchers.containsString("Path=/"),
                org.hamcrest.Matchers.containsString("Max-Age=0"),
                org.hamcrest.Matchers.containsString("HttpOnly"),
                org.hamcrest.Matchers.containsString("Secure"),
                org.hamcrest.Matchers.containsString("SameSite=Lax"))));

    assertThat(currentSession.isInvalid()).isTrue();
    assertThat(otherSession.isInvalid()).isFalse();
    verify(auditLogger).success();
  }

  @Test
  void allowsPasswordChangeRequiredUsersToLogOut() throws Exception {
    MockHttpSession session = authenticatedSession();

    mockMvc.perform(post("/api/auth/logout").with(user(new LoginPrincipal("42", true)))
        .session(session).with(csrf())).andExpect(status().isNoContent());

    assertThat(session.isInvalid()).isTrue();
  }

  @Test
  void rejectsLogoutWithoutCsrfValidation() throws Exception {
    MockHttpSession session = authenticatedSession();

    mockMvc
        .perform(
            post("/api/auth/logout").with(user(new LoginPrincipal("42", false))).session(session))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_VALIDATION_FAILED"));

    assertThat(session.isInvalid()).isFalse();
  }

  @Test
  void treatsAnonymousAndRepeatedLogoutAsSafeWithoutDisclosingSessionState() throws Exception {
    mockMvc.perform(post("/api/auth/logout").with(csrf())).andExpect(status().isNoContent())
        .andExpect(header().string("Set-Cookie",org.hamcrest.Matchers.containsString("Max-Age=0")));

    MockHttpSession session = authenticatedSession();
    mockMvc.perform(post("/api/auth/logout").with(user(new LoginPrincipal("42", false)))
        .session(session).with(csrf())).andExpect(status().isNoContent());
    mockMvc.perform(post("/api/auth/logout").with(csrf())).andExpect(status().isNoContent());
  }

  @Test
  void rejectsReuseOfTheTerminatedSessionForProtectedResources() throws Exception {
    MockHttpSession session = authenticatedSession();
    mockMvc.perform(post("/api/auth/logout").with(user(new LoginPrincipal("42", false)))
        .session(session).with(csrf())).andExpect(status().isNoContent());

    mockMvc.perform(get("/api/logout-test/protected").session(session))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
  }

  private MockHttpSession authenticatedSession() {
    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);
    return session;
  }
}

@Controller
class LogoutTestController {

  @GetMapping("/api/logout-test/protected")
  void protectedResource() {
  }
}
