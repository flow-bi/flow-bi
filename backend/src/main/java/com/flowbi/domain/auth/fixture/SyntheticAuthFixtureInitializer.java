package com.flowbi.domain.auth.fixture;

import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.service.PositionService;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.service.TeamService;
import com.flowbi.domain.user.service.EmployeeAccountRegistrationRequest;
import com.flowbi.domain.user.service.EmployeeAccountRegistrationService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
public class SyntheticAuthFixtureInitializer implements ApplicationRunner {

  private static final String FIXTURE_POSITION = "Synthetic Fixture Position";
  private static final String FIXTURE_TEAM = "Synthetic Fixture Team";
  private final TestFixtureProperties properties;
  private final Environment environment;
  private final EmployeeAccountRegistrationService registrations;
  private final PositionService positions;
  private final TeamService teams;

  public SyntheticAuthFixtureInitializer(TestFixtureProperties properties, Environment environment,
      EmployeeAccountRegistrationService registrations, PositionService positions,
      TeamService teams) {
    this.properties = properties;
    this.environment = environment;
    this.registrations = registrations;
    this.positions = positions;
    this.teams = teams;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (!properties.isEnabled())
      return;
    validateConfiguration();
    Position position = positions.findOrCreate(FIXTURE_POSITION);
    Team team = teams.findOrCreate(FIXTURE_TEAM);
    createIfMissing(properties.getNormal(),false,position,team);
    createIfMissing(properties.getPasswordChangeRequired(),true,position,team);
  }

  private void validateConfiguration() {
    if (!environment.acceptsProfiles(Profiles.of("local","test"))
        || environment.acceptsProfiles(Profiles.of("prod","production"))) {
      throw new IllegalStateException(
          "Synthetic authentication fixtures are disabled outside local and test.");
    }
    TestFixtureProperties.Account normal = properties.getNormal();
    TestFixtureProperties.Account passwordChangeRequired = properties.getPasswordChangeRequired();
    if (!hasRequiredValues(normal) || !hasRequiredValues(passwordChangeRequired)) {
      throw new IllegalStateException(
          "Synthetic authentication fixture configuration is incomplete.");
    }
    if (normal.getEmployeeNumber().equals(passwordChangeRequired.getEmployeeNumber())) {
      throw new IllegalStateException(
          "Synthetic authentication fixture employee numbers must be distinct.");
    }
  }

  private boolean hasRequiredValues(TestFixtureProperties.Account account) {
    return account != null && StringUtils.hasText(account.getEmployeeNumber())
        && StringUtils.hasText(account.getPassword());
  }

  private void createIfMissing(TestFixtureProperties.Account account,boolean mustChangePassword,
      Position position,Team team) {
    registrations.registerFixture(new EmployeeAccountRegistrationRequest(
        account.getEmployeeNumber(), "Synthetic Fixture", team.getTeamId(),
        position.getPositionId(), account.getPassword(), account.getPassword()),mustChangePassword);
  }
}
