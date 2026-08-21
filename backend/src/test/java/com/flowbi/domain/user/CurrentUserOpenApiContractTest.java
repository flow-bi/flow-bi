package com.flowbi.domain.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@ActiveProfiles("harness")
@AutoConfigureMockMvc
@SpringBootTest
class CurrentUserOpenApiContractTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void documentsTheCurrentUserNameResponseWithoutIdentityInputOrExtraProfileFields()
      throws Exception {
    mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/me/header'].get").exists())
        .andExpect(jsonPath("$.paths['/api/me/header'].get.parameters").doesNotExist())
        .andExpect(jsonPath("$.paths['/api/me/header'].get.responses['200']").exists())
        .andExpect(jsonPath("$.paths['/api/me/header'].get.responses['401']").exists())
        .andExpect(jsonPath("$.paths['/api/me/header'].get.responses['403']").exists())
        .andExpect(jsonPath("$.components.schemas.CurrentUserResponse.properties.name").exists())
        .andExpect(
            jsonPath("$.components.schemas.CurrentUserResponse.properties.userId").doesNotExist())
        .andExpect(jsonPath("$.components.schemas.CurrentUserResponse.properties.employeeNumber")
            .doesNotExist())
        .andExpect(
            jsonPath("$.components.schemas.CurrentUserResponse.properties.email").doesNotExist())
        .andExpect(jsonPath("$.components.schemas.CurrentUserResponse.properties.sessionId")
            .doesNotExist());
  }
}
