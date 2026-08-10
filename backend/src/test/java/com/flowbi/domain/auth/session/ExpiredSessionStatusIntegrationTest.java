package com.flowbi.domain.auth.session;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.login.LoginPrincipal;
import com.flowbi.domain.auth.security.AbsoluteSessionTimeoutFilter;
import com.flowbi.domain.auth.security.CsrfTokenController;
import com.flowbi.domain.auth.security.SecurityConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = SessionStatusController.class)
@Import({SecurityConfiguration.class, AbsoluteSessionTimeoutFilter.class, CsrfTokenController.class,
    SessionGenerationValidationFilter.class})
@TestPropertySource(properties = "auth.session.absolute-timeout=PT0S")
class ExpiredSessionStatusIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private SessionGenerationService sessionGenerationService;

  @Test
  void rejectsAnExpiredSessionAsUnauthenticated() throws Exception {
    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);

    mockMvc
        .perform(
            get("/api/auth/session").with(user(new LoginPrincipal("42", false))).session(session))
        .andExpect(status().isUnauthorized()).andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
  }
}
