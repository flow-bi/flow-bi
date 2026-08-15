package com.flowbi.domain.auth.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.flowbi.domain.auth.entity.UserCredential;
import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.entity.UserStatus;
import com.flowbi.domain.user.repository.UserRepository;
import com.flowbi.domain.user.service.EmployeeAccountRegistration;
import com.flowbi.domain.user.service.EmployeeAccountRegistrationException;
import com.flowbi.domain.user.service.EmployeeAccountRegistrationRequest;
import com.flowbi.domain.user.service.EmployeeAccountRegistrationService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Testcontainers
class AuthenticationPersistenceIntegrationTest {

  @Container
  static PostgreSQLContainer<?> postgresql = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url",postgresql::getJdbcUrl);
    registry.add("spring.datasource.username",postgresql::getUsername);
    registry.add("spring.datasource.password",postgresql::getPassword);
    registry.add("spring.datasource.driver-class-name",postgresql::getDriverClassName);
    registry.add("spring.jpa.database-platform",() -> "org.hibernate.dialect.PostgreSQLDialect");
    registry.add("spring.jpa.hibernate.ddl-auto",() -> "validate");
  }

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private UserCredentialRepository userCredentialRepository;

  @Autowired
  private PositionRepository positionRepository;

  @Autowired
  private TeamRepository teamRepository;

  @Autowired
  private Flyway flyway;

  @Autowired
  private DataSource dataSource;

  @Autowired
  private EmployeeAccountRegistrationService registrations;

  @Autowired
  private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

  @Test
  void registersAnActiveEmployeeAndCredentialAgainstPostgreSqlWithoutPartialInvalidAccounts() {
    Position position = position();
    Team team = team();

    EmployeeAccountRegistration registration = registrations
        .register(new EmployeeAccountRegistrationRequest("employee-registration",
            "employee-registration@example.test", "Kim", team.getTeamId(), position.getPositionId(),
            "Password123!", "Password123!"));
    UserCredential credential = userCredentialRepository
        .findByUserUserId(registration.user().getUserId()).orElseThrow();

    assertThat(registration.user().getStatus()).isEqualTo(UserStatus.ACTIVE);
    assertThat(registration.user().getTeam().getTeamId()).isEqualTo(team.getTeamId());
    assertThat(registration.user().getPosition().getPositionId())
        .isEqualTo(position.getPositionId());
    assertThat(credential.isMustChangePassword()).isTrue();
    assertThat(passwordEncoder.matches("Password123!",credential.getPasswordHash())).isTrue();
    long usersBeforeInvalidRequest = userRepository.count();

    assertThatThrownBy(() -> registrations.register(
        new EmployeeAccountRegistrationRequest("employee-invalid", "employee-invalid@example.test",
            "Kim", Long.MAX_VALUE, position.getPositionId(), "Password123!", "Password123!")))
        .isInstanceOf(EmployeeAccountRegistrationException.class);
    assertThatThrownBy(
        () -> registrations.register(new EmployeeAccountRegistrationRequest("employee-registration",
            "employee-registration@example.test", "Kim", team.getTeamId(), position.getPositionId(),
            "Password123!", "Password123!")))
        .isInstanceOf(EmployeeAccountRegistrationException.class);
    assertThat(userRepository.count()).isEqualTo(usersBeforeInvalidRequest);
    assertThat(userCredentialRepository.count()).isEqualTo(1);
  }

  @Test
  void keepsEmployeeNumberAndCredentialUserRelationshipUnique() {
    User user = userRepository.save(User.create("synthetic-user-a","synthetic-user-a@example.test",
        "Fixture User",position(),team()));
    userCredentialRepository
        .save(UserCredential.create(user,"$2a$10$hash-value-that-is-never-a-real-password",true));

    assertThatThrownBy(() -> userRepository.saveAndFlush(User.create("synthetic-user-a",
        "synthetic-user-a-2@example.test","Fixture User",position(),team())))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void createsTheFlywayBaselineTablesAndMapsUserOrganizationRelationships() throws Exception {
    assertThat(tableExists("positions")).isTrue();
    assertThat(tableExists("teams")).isTrue();
    assertThat(tableExists("users")).isTrue();
    assertThat(tableExists("user_credentials")).isTrue();

    Position position = position();
    Team team = team();
    User user = userRepository.save(User.create("synthetic-user-d","synthetic-user-d@example.test",
        "Fixture User",position,team));
    User foundUser = userRepository.findByEmployeeNumber("synthetic-user-d").orElseThrow();

    assertThat(foundUser.getPosition()).isNotNull();
    assertThat(foundUser.getTeam()).isNotNull();
  }

  @Test
  void keepsOneCredentialPerUser() {
    User user = userRepository.save(User.create("synthetic-user-c","synthetic-user-c@example.test",
        "Fixture User",position(),team()));
    userCredentialRepository
        .save(UserCredential.create(user,"$2a$10$hash-value-that-is-never-a-real-password",true));

    assertThatThrownBy(() -> userCredentialRepository
        .saveAndFlush(UserCredential.create(user,"$2a$10$another-non-secret-hash",true)))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void persistsCredentialWithoutExposingHashThroughUserLookup() {
    User user = userRepository.save(User.create("synthetic-user-b","synthetic-user-b@example.test",
        "Fixture User",position(),team()));
    UserCredential credential = userCredentialRepository
        .save(UserCredential.create(user,"$2a$10$hash-value-that-is-never-a-real-password",true));

    User foundUser = userRepository.findByEmployeeNumber("synthetic-user-b").orElseThrow();
    UserCredential foundCredential = userCredentialRepository
        .findByUserUserId(foundUser.getUserId()).orElseThrow();

    assertThat(foundUser.getEmployeeNumber()).isEqualTo("synthetic-user-b");
    assertThat(foundCredential.isMustChangePassword()).isTrue();
    assertThat(foundCredential.getPasswordHash()).hasSizeLessThanOrEqualTo(255);
    assertThat(foundCredential.getCredentialId()).isEqualTo(credential.getCredentialId());
  }

  @Test
  void reappliesMigrationAndRollsBackAFailedMigrationAtomically() throws Exception {
    assertThat(flyway.migrate().migrationsExecuted).isZero();

    Path failedMigrationDirectory = Files.createTempDirectory("failed-migration-");
    try {
      Files.writeString(failedMigrationDirectory.resolve("V3__fail_atomically.sql"),
          "CREATE TABLE failed_migration_probe (id BIGINT);\nINVALID SQL;");

      Flyway failingFlyway = Flyway.configure()
          .dataSource(postgresql.getJdbcUrl(),postgresql.getUsername(),postgresql.getPassword())
          .locations("classpath:db/migration","filesystem:" + failedMigrationDirectory).load();

      assertThatThrownBy(failingFlyway::migrate).isInstanceOf(RuntimeException.class);
      assertThat(tableExists("failed_migration_probe")).isFalse();
    } finally {
      Files.deleteIfExists(failedMigrationDirectory.resolve("V3__fail_atomically.sql"));
      Files.deleteIfExists(failedMigrationDirectory);
    }
  }

  private boolean tableExists(String tableName) throws Exception {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement();
        ResultSet resultSet = statement.executeQuery(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '"
                + tableName + "')")) {
      resultSet.next();
      return resultSet.getBoolean(1);
    }
  }

  private Position position() {
    return positionRepository.save(Position.create("Fixture Position"));
  }

  private Team team() {
    return teamRepository.save(Team.create("Fixture Team"));
  }
}
