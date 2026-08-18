package com.flowbi.domain.auth.session;
import com.flowbi.domain.auth.security.AuthSecurityProperties;
import com.flowbi.domain.auth.security.SecurityConfiguration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import com.flowbi.domain.auth.security.CsrfTokenController;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = SecurityTestController.class)
@Import({SecurityConfiguration.class, AbsoluteSessionTimeoutFilter.class, CsrfTokenController.class,
    SessionGenerationValidationFilter.class})
class SecurityConfigurationIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private CookieSerializer cookieSerializer;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @MockBean
  private SessionGenerationService sessionGenerationService;

  @Test
  void allowsOnlyExplicitPublicEndpointsAndRejectsAnonymousProtectedRequests() throws Exception {
    mockMvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andExpect(
        header().string("Set-Cookie",org.hamcrest.Matchers.containsString("XSRF-TOKEN=")));

    mockMvc.perform(get("/api/security-test/protected")).andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
  }

  @Test
  void rejectsStateChangesWithoutValidCsrfHeaderAndAllowsValidToken() throws Exception {
    MockHttpSession session = authenticatedSession();
    mockMvc.perform(post("/api/security-test/protected").with(user("42")).session(session))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_VALIDATION_FAILED"));

    mockMvc
        .perform(
            post("/api/security-test/protected").with(user("42")).session(session).with(csrf()))
        .andExpect(status().isOk());
  }

  @Test
  void refusesCrossOriginCredentialedRequestsUnlessOriginIsExplicitlyConfigured() throws Exception {
    mockMvc.perform(
        options("/api/security-test/protected").header("Origin","https://untrusted.example")
            .header("Access-Control-Request-Method","POST"))
        .andExpect(status().isForbidden());
  }

  @Test
  void serializesOpaqueSessionCookieWithRequiredAttributes() {
    MockHttpServletResponse response = new MockHttpServletResponse();
    cookieSerializer.writeCookieValue(new CookieSerializer.CookieValue(new MockHttpServletRequest(),
        response, "opaque-session-id"));

    String setCookie = response.getHeader("Set-Cookie");
    assertThat(setCookie).contains("SESSION=","Path=/","HttpOnly","Secure","SameSite=Lax")
        .doesNotContain("opaque-session-id");
  }

  @Test
  void providesThePasswordEncoderFromTheAuthenticationSecurityConfiguration() {
    assertThat(passwordEncoder).isInstanceOf(BCryptPasswordEncoder.class);
  }

  @Test
  void suppressesGeneratedCredentialsAndCredentialValuesInApplicationLogs() throws IOException {
    String applicationConfiguration = Files
        .readString(Path.of("src/main/resources/application.yml"));

    assertThat(applicationConfiguration).contains("show-sql: false",
        "UserDetailsServiceAutoConfiguration");
  }

  @Test
  void invalidatesSessionsPastAbsoluteTimeoutBeforeAuthorizationContinues() throws Exception {
    AuthSecurityProperties properties = new AuthSecurityProperties();
    properties.getSession().setAbsoluteTimeout(Duration.ofHours(10));
    AbsoluteSessionTimeoutFilter filter = new AbsoluteSessionTimeoutFilter(properties,
        Clock.fixed(Instant.parse("2026-01-01T10:00:00Z"),ZoneOffset.UTC));
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    HttpSession session = mock(HttpSession.class);
    FilterChain chain = mock(FilterChain.class);
    when(request.getSession(false)).thenReturn(session);
    when(session.getCreationTime()).thenReturn(0L);

    filter.doFilter(request,response,chain);

    verify(session).invalidate();
    verify(chain).doFilter(request,response);
  }

  @Test
  void rejectsRequestsWhenRedisSessionAccessFails() throws Exception {
    RedisSessionFailureFilter filter = new RedisSessionFailureFilter();
    HttpServletRequest request = mock(HttpServletRequest.class);
    MockHttpServletResponse response = new MockHttpServletResponse();
    FilterChain chain = mock(FilterChain.class);
    when(request.getRequestURI()).thenReturn("/api/security-test/protected");
    org.mockito.Mockito.doThrow(new RedisConnectionFailureException("redis-failure")).when(chain)
        .doFilter(request,response);

    filter.doFilter(request,response,chain);

    assertThat(response.getStatus()).isEqualTo(503);
    assertThat(response.getContentAsString()).contains("AUTH_SESSION_UNAVAILABLE")
        .doesNotContain("redis-failure");
  }

  @Test
  void validatesSessionGenerationForEveryAuthenticatedProtectedRequest() throws Exception {
    MockHttpSession session = authenticatedSession();

    mockMvc.perform(get("/api/security-test/protected").with(user("42")).session(session))
        .andExpect(status().isOk());

    verify(sessionGenerationService).verifySession("42",0L,session.getId());
  }

  private MockHttpSession authenticatedSession() {
    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);
    return session;
  }

}
