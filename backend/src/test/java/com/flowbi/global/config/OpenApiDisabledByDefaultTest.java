package com.flowbi.global.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import com.flowbi.test.PostgresSpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@PostgresSpringBootTest
class OpenApiDisabledByDefaultTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void doesNotExposeOpenApiDocumentsByDefault() throws Exception {
    mockMvc.perform(get("/v3/api-docs")).andExpect(status().isNotFound());
  }

  @Test
  void doesNotExposeSwaggerUiByDefault() throws Exception {
    mockMvc.perform(get("/swagger-ui.html")).andExpect(status().isNotFound());
  }
}
