package com.flowbi.domain.auth.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.flowbi.domain.auth.persistence.entity.AuthUser;
import com.flowbi.domain.auth.persistence.entity.Position;
import com.flowbi.domain.auth.persistence.entity.Team;
import com.flowbi.domain.auth.persistence.entity.UserCredential;
import com.flowbi.domain.auth.persistence.repository.AuthUserRepository;
import com.flowbi.domain.auth.persistence.repository.PositionRepository;
import com.flowbi.domain.auth.persistence.repository.TeamRepository;
import com.flowbi.domain.auth.persistence.repository.UserCredentialRepository;
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
  private AuthUserRepository authUserRepository;

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

  @Test
  void keepsEmployeeNumberAndCredentialUserRelationshipUnique() {
    AuthUser user = authUserRepository.save(AuthUser.create("synthetic-user-a",position(),team()));
    userCredentialRepository
        .save(UserCredential.create(user,"$2a$10$hash-value-that-is-never-a-real-password",true));

    assertThatThrownBy(() -> authUserRepository
        .saveAndFlush(AuthUser.create("synthetic-user-a",position(),team())))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void keepsOneCredentialPerUser() {
    AuthUser user = authUserRepository.save(AuthUser.create("synthetic-user-c",position(),team()));
    userCredentialRepository
        .save(UserCredential.create(user,"$2a$10$hash-value-that-is-never-a-real-password",true));

    assertThatThrownBy(() -> userCredentialRepository
        .saveAndFlush(UserCredential.create(user,"$2a$10$another-non-secret-hash",true)))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void persistsCredentialWithoutExposingHashThroughUserLookup() {
    AuthUser user = authUserRepository.save(AuthUser.create("synthetic-user-b",position(),team()));
    UserCredential credential = userCredentialRepository
        .save(UserCredential.create(user,"$2a$10$hash-value-that-is-never-a-real-password",true));

    AuthUser foundUser = authUserRepository.findByEmployeeNumber("synthetic-user-b").orElseThrow();
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
      Files.writeString(failedMigrationDirectory.resolve("V2__fail_atomically.sql"),
          "CREATE TABLE failed_migration_probe (id BIGINT);\nINVALID SQL;");

      Flyway failingFlyway = Flyway.configure()
          .dataSource(postgresql.getJdbcUrl(),postgresql.getUsername(),postgresql.getPassword())
          .locations("classpath:db/migration","filesystem:" + failedMigrationDirectory).load();

      assertThatThrownBy(failingFlyway::migrate).isInstanceOf(RuntimeException.class);
      assertThat(tableExists("failed_migration_probe")).isFalse();
    } finally {
      Files.deleteIfExists(failedMigrationDirectory.resolve("V2__fail_atomically.sql"));
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
