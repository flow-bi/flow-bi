package com.flowbi.domain.auth.password;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import com.flowbi.domain.auth.login.LoginPrincipal;
import com.flowbi.domain.auth.security.SecurityConfiguration;
import com.flowbi.domain.auth.security.AbsoluteSessionTimeoutFilter;
import com.flowbi.domain.auth.security.CsrfTokenController;
import com.flowbi.domain.auth.session.SessionGenerationService;
import com.flowbi.domain.auth.session.SessionGenerationValidationFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;

@WebMvcTest(controllers = PasswordTestController.class)
@Import({SecurityConfiguration.class, AbsoluteSessionTimeoutFilter.class, CsrfTokenController.class,
    SessionGenerationValidationFilter.class, MustChangePasswordFilter.class})
class MustChangePasswordFilterTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private SessionGenerationService generations;

  @Test
  void blocksGeneralEndpointsButAllowsPasswordChangeAndLogoutForTemporaryPasswordUsers()
      throws Exception {
    LoginPrincipal principal = new LoginPrincipal("42", true);
    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);

    mockMvc.perform(get("/api/password-test/general").with(user(principal)).session(session))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
    mockMvc.perform(put("/api/auth/password").with(user(principal)).session(session).with(csrf()))
        .andExpect(status().isNotFound());
    mockMvc.perform(post("/api/auth/logout").with(user(principal)).session(session).with(csrf()))
        .andExpect(status().isNotFound());
  }
}
