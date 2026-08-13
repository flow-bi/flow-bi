package com.flowbi.global.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
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
class OpenApiInfrastructureTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void exposesOpenApiMetadataInHarnessProfile() throws Exception {
    mockMvc.perform(get("/v3/api-docs")).andDo(print()).andExpect(status().isOk())
        .andExpect(jsonPath("$.openapi").isNotEmpty())
        .andExpect(jsonPath("$.info.title").value("Flow BI API"))
        .andExpect(jsonPath("$.info.version").value("0.0.1-SNAPSHOT"));
  }

  @Test
  void redirectsSwaggerUiEntryPointInHarnessProfile() throws Exception {
    mockMvc.perform(get("/swagger-ui.html")).andExpect(status().is3xxRedirection())
        .andExpect(redirectedUrl("/swagger-ui/index.html"));
  }
}
