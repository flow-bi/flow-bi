package com.flowbi.domain.auth.fixture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.security.AbsoluteSessionTimeoutFilter;
import com.flowbi.domain.auth.security.CsrfTokenController;
import com.flowbi.domain.auth.security.SecurityConfiguration;
import com.flowbi.domain.auth.session.SessionGenerationService;
import com.flowbi.domain.auth.session.SessionGenerationValidationFilter;
import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.service.PositionService;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.service.TeamService;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.service.EmployeeAccountRegistration;
import com.flowbi.domain.user.service.EmployeeAccountRegistrationService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = DevEmployeeAccountController.class)
@ActiveProfiles("test")
@TestPropertySource(properties = "auth.test-fixtures.enabled=true")
@Import({SecurityConfiguration.class, AbsoluteSessionTimeoutFilter.class, CsrfTokenController.class,
    SessionGenerationValidationFilter.class})
class DevEmployeeAccountControllerTest {

  private final WebApplicationContextRunner contextRunner = new WebApplicationContextRunner()
      .withUserConfiguration(ControllerConfiguration.class);

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private TeamService teams;

  @MockBean
  private PositionService positions;

  @MockBean
  private EmployeeAccountRegistrationService registrations;

  @MockBean
  private SessionGenerationService generations;

  @Test
  void exposesOnlySafeOptionsAndCreatesAnAccountWithCsrfProtection() throws Exception {
    Team team = Team.create("People");
    Position position = Position.create("Manager");
    User user = User.create("E100","Kim",position,team);
    when(teams.findAll()).thenReturn(List.of(team));
    when(positions.findAll()).thenReturn(List.of(position));
    when(registrations.register(any())).thenReturn(new EmployeeAccountRegistration(user, true));

    mockMvc.perform(get("/api/dev/auth/employee-account-options")).andExpect(status().isOk())
        .andExpect(jsonPath("$.teams[0].name").value("People"))
        .andExpect(jsonPath("$.positions[0].name").value("Manager"));
    mockMvc
        .perform(post("/api/dev/auth/employee-accounts").contentType("application/json")
            .content(requestBody()))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_VALIDATION_FAILED"));
    mockMvc
        .perform(post("/api/dev/auth/employee-accounts").with(csrf())
            .contentType("application/json").content(requestBody()))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.employeeNumber").value("E100"))
        .andExpect(jsonPath("$.mustChangePassword").value(true))
        .andExpect(jsonPath("$.initialPassword").doesNotExist());
  }

  @Test
  void registersTheDevelopmentAdapterOnlyForAnEnabledLocalOrTestProfile() {
    contextRunner.withPropertyValues("auth.test-fixtures.enabled=true")
        .withInitializer(context -> context.getEnvironment().setActiveProfiles("test"))
        .run(context -> assertThat(context).hasSingleBean(DevEmployeeAccountController.class));
    contextRunner.withPropertyValues("auth.test-fixtures.enabled=false")
        .withInitializer(context -> context.getEnvironment().setActiveProfiles("test"))
        .run(context -> assertThat(context).doesNotHaveBean(DevEmployeeAccountController.class));
    contextRunner.withPropertyValues("auth.test-fixtures.enabled=true")
        .withInitializer(context -> context.getEnvironment().setActiveProfiles("production"))
        .run(context -> assertThat(context).doesNotHaveBean(DevEmployeeAccountController.class));
  }

  private String requestBody() {
    return """
        {"employeeNumber":"E100","name":"Kim","teamId":1,"positionId":2,
         "initialPassword":"Password123!","confirmation":"Password123!"}
        """;
  }

  @Configuration(proxyBeanMethods = false)
  @Import(DevEmployeeAccountController.class)
  static class ControllerConfiguration {

    @Bean
    TeamService teams() {
      return org.mockito.Mockito.mock(TeamService.class);
    }

    @Bean
    PositionService positions() {
      return org.mockito.Mockito.mock(PositionService.class);
    }

    @Bean
    EmployeeAccountRegistrationService registrations() {
      return org.mockito.Mockito.mock(EmployeeAccountRegistrationService.class);
    }
  }
}
