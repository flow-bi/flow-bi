package com.flowbi.domain.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowbi.domain.auth.entity.UserCredential;
import com.flowbi.domain.auth.repository.UserCredentialRepository;
import com.flowbi.domain.auth.repository.UserTokenRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private UserCredentialRepository credentialRepository;

  @Autowired
  private UserTokenRepository tokenRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @BeforeEach
  void setUp() {
    tokenRepository.deleteAll();
    credentialRepository.deleteAll();
    userRepository.deleteAll();

    User user = userRepository.save(new User(1L, 1L, "EMP001", "홍길동"));
    credentialRepository
        .save(new UserCredential(user.getUserId(), passwordEncoder.encode("password123")));
  }

  @Test
  void loginSucceeds() throws Exception {
    mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
        {
          "employee_number": "EMP001",
          "password": "password123",
          "device_info": "desktop"
        }
        """)).andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.access_token").isString())
        .andExpect(jsonPath("$.data.refresh_token").isString())
        .andExpect(jsonPath("$.data.user.employee_number").value("EMP001"));
  }

  @Test
  void loginFailsWithWrongPassword() throws Exception {
    mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
        {
          "employee_number": "EMP001",
          "password": "wrong-password",
          "device_info": "desktop"
        }
        """)).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.error.code").value("AUTH_001"));
  }

  @Test
  void refreshFailsAfterLogout() throws Exception {
    String refreshToken = loginAndReadRefreshToken("desktop");

    mockMvc.perform(post("/api/v1/auth/logout").contentType(MediaType.APPLICATION_JSON).content("""
        {
          "refresh_token": "%s"
        }
        """.formatted(refreshToken))).andExpect(status().isOk());

    mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content("""
        {
          "refresh_token": "%s"
        }
        """.formatted(refreshToken))).andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  void refreshTokensAreIndependentByDevice() throws Exception {
    String desktopRefreshToken = loginAndReadRefreshToken("desktop");
    String mobileRefreshToken = loginAndReadRefreshToken("mobile");

    mockMvc.perform(post("/api/v1/auth/logout").contentType(MediaType.APPLICATION_JSON).content("""
        {
          "refresh_token": "%s"
        }
        """.formatted(desktopRefreshToken))).andExpect(status().isOk());

    mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content("""
        {
          "refresh_token": "%s"
        }
        """.formatted(mobileRefreshToken))).andExpect(status().isOk())
        .andExpect(jsonPath("$.data.refresh_token").isString());

    assertThat(tokenRepository.findByRefreshToken(desktopRefreshToken)).isEmpty();
  }

  private String loginAndReadRefreshToken(String deviceInfo) throws Exception {
    MvcResult result = mockMvc
        .perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
            {
              "employee_number": "EMP001",
              "password": "password123",
              "device_info": "%s"
            }
            """.formatted(deviceInfo))).andExpect(status().isOk()).andReturn();

    JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
    return root.path("data").path("refresh_token").asText();
  }
}
