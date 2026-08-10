package com.flowbi.domain.auth.fixture;

import com.flowbi.domain.auth.persistence.entity.AuthUser;
import com.flowbi.domain.auth.persistence.entity.Position;
import com.flowbi.domain.auth.persistence.entity.Team;
import com.flowbi.domain.auth.persistence.entity.UserCredential;
import com.flowbi.domain.auth.persistence.repository.AuthUserRepository;
import com.flowbi.domain.auth.persistence.repository.PositionRepository;
import com.flowbi.domain.auth.persistence.repository.TeamRepository;
import com.flowbi.domain.auth.persistence.repository.UserCredentialRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
public class SyntheticAuthFixtureInitializer implements ApplicationRunner {

  private static final String FIXTURE_POSITION = "Synthetic Fixture Position";
  private static final String FIXTURE_TEAM = "Synthetic Fixture Team";
  private final TestFixtureProperties properties;
  private final Environment environment;
  private final AuthUserRepository authUserRepository;
  private final PositionRepository positionRepository;
  private final TeamRepository teamRepository;
  private final UserCredentialRepository userCredentialRepository;
  private final PasswordEncoder passwordEncoder;

  public SyntheticAuthFixtureInitializer(TestFixtureProperties properties, Environment environment,
      AuthUserRepository authUserRepository, PositionRepository positionRepository,
      TeamRepository teamRepository, UserCredentialRepository userCredentialRepository,
      PasswordEncoder passwordEncoder) {
    this.properties = properties;
    this.environment = environment;
    this.authUserRepository = authUserRepository;
    this.positionRepository = positionRepository;
    this.teamRepository = teamRepository;
    this.userCredentialRepository = userCredentialRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (!properties.isEnabled())
      return;
    validateConfiguration();
    Position position = positionRepository.findByPositionName(FIXTURE_POSITION)
        .orElseGet(() -> positionRepository.save(Position.create(FIXTURE_POSITION)));
    Team team = teamRepository.findByTeamName(FIXTURE_TEAM)
        .orElseGet(() -> teamRepository.save(Team.create(FIXTURE_TEAM)));
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
    AuthUser user = authUserRepository.findByEmployeeNumber(account.getEmployeeNumber()).orElseGet(
        () -> authUserRepository.save(AuthUser.create(account.getEmployeeNumber(),position,team)));
    if (userCredentialRepository.findByUserUserId(user.getUserId()).isPresent())
      return;
    userCredentialRepository.save(UserCredential.create(user,
        passwordEncoder.encode(account.getPassword()),mustChangePassword));
  }
}
