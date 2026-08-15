package com.flowbi.domain.auth.fixture;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.flowbi.domain.position.service.PositionService;
import com.flowbi.domain.team.service.TeamService;
import com.flowbi.domain.user.service.EmployeeAccountRegistrationService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

class SyntheticAuthFixtureInitializerTest {

  @Test
  void rejectsEnabledFixturesWhenAnExplicitEmailIsMissing() {
    TestFixtureProperties properties = configuredProperties();
    properties.getNormal().setEmail(" ");
    PositionService positions = mock(PositionService.class);
    TeamService teams = mock(TeamService.class);
    EmployeeAccountRegistrationService registrations = mock(
        EmployeeAccountRegistrationService.class);
    SyntheticAuthFixtureInitializer initializer = new SyntheticAuthFixtureInitializer(properties,
        localOrTestEnvironment(), registrations, positions, teams);

    assertThatThrownBy(() -> initializer.run(mock(ApplicationArguments.class)))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Synthetic authentication fixture configuration is incomplete.");
    verifyNoInteractions(positions,teams,registrations);
  }

  @Test
  void rejectsEnabledFixturesWhenTheirExplicitEmailsAreDuplicated() {
    TestFixtureProperties properties = configuredProperties();
    properties.getPasswordChangeRequired().setEmail(properties.getNormal().getEmail());
    PositionService positions = mock(PositionService.class);
    TeamService teams = mock(TeamService.class);
    EmployeeAccountRegistrationService registrations = mock(
        EmployeeAccountRegistrationService.class);
    SyntheticAuthFixtureInitializer initializer = new SyntheticAuthFixtureInitializer(properties,
        localOrTestEnvironment(), registrations, positions, teams);

    assertThatThrownBy(() -> initializer.run(mock(ApplicationArguments.class)))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Synthetic authentication fixture accounts must be distinct.");
    verifyNoInteractions(positions,teams,registrations);
  }

  private TestFixtureProperties configuredProperties() {
    TestFixtureProperties properties = new TestFixtureProperties();
    properties.setEnabled(true);
    configure(properties.getNormal(),"fixture-normal","normal@example.test");
    configure(properties.getPasswordChangeRequired(),"fixture-password-change",
        "password-change@example.test");
    return properties;
  }

  private void configure(TestFixtureProperties.Account account,String employeeNumber,String email) {
    account.setEmployeeNumber(employeeNumber);
    account.setEmail(email);
    account.setPassword("Password1!");
  }

  private Environment localOrTestEnvironment() {
    Environment environment = mock(Environment.class);
    when(environment.acceptsProfiles(Profiles.of("local","test"))).thenReturn(true);
    when(environment.acceptsProfiles(Profiles.of("prod","production"))).thenReturn(false);
    return environment;
  }
}
