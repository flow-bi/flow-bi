package com.flowbi.domain.user;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.password.MustChangePasswordFilter;
import com.flowbi.domain.auth.security.CsrfTokenController;
import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.auth.security.SecurityConfiguration;
import com.flowbi.domain.auth.session.AbsoluteSessionTimeoutFilter;
import com.flowbi.domain.auth.session.SessionGenerationService;
import com.flowbi.domain.auth.session.SessionGenerationValidationFilter;
import com.flowbi.domain.user.controller.CurrentUserController;
import com.flowbi.domain.user.dto.CurrentUserResponse;
import com.flowbi.domain.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = CurrentUserController.class)
@Import({SecurityConfiguration.class, AbsoluteSessionTimeoutFilter.class, CsrfTokenController.class,
    SessionGenerationValidationFilter.class, MustChangePasswordFilter.class})
class CurrentUserControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private SessionGenerationService generations;

  @MockBean
  private UserService users;

  @Test
  void returnsOnlyTheAuthenticatedPrincipalsNameWithoutAcceptingUserIdentityInput()
      throws Exception {
    when(users.getCurrentUser(42L)).thenReturn(new CurrentUserResponse("Kim Flow"));

    mockMvc.perform(authenticatedRequest().queryParam("userId","99").header("X-User-Id","99"))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.name").value("Kim Flow"))
        .andExpect(jsonPath("$.userId").doesNotExist())
        .andExpect(jsonPath("$.employeeNumber").doesNotExist())
        .andExpect(jsonPath("$.email").doesNotExist()).andExpect(jsonPath("$.team").doesNotExist())
        .andExpect(jsonPath("$.position").doesNotExist())
        .andExpect(jsonPath("$.role").doesNotExist())
        .andExpect(jsonPath("$.credential").doesNotExist())
        .andExpect(jsonPath("$.sessionId").doesNotExist());

    verify(users).getCurrentUser(42L);
  }

  @Test
  void rejectsAnonymousAndPasswordChangeRequiredRequests() throws Exception {
    mockMvc.perform(get("/api/me/header")).andExpect(status().isUnauthorized())
        .andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    mockMvc.perform(authenticatedRequest(new LoginPrincipal("42", true)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
  }

  @Test
  void hidesMissingOrInactivePrincipalUsersWithoutReturningPersonalData() throws Exception {
    when(users.getCurrentUser(42L))
        .thenThrow(new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND));

    mockMvc.perform(authenticatedRequest()).andExpect(status().isNotFound())
        .andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.name").doesNotExist())
        .andExpect(jsonPath("$.employeeNumber").doesNotExist())
        .andExpect(jsonPath("$.email").doesNotExist())
        .andExpect(jsonPath("$.sessionId").doesNotExist());
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder authenticatedRequest() {
    return authenticatedRequest(new LoginPrincipal("42", false));
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder authenticatedRequest(
      LoginPrincipal principal) {
    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);
    return get("/api/me/header").with(user(principal)).session(session);
  }
}
