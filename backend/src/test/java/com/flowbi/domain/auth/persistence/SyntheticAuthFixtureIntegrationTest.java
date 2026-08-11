package com.flowbi.domain.auth.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.auth.fixture.SyntheticAuthFixtureInitializer;
import com.flowbi.domain.auth.persistence.entity.AuthUser;
import com.flowbi.domain.auth.persistence.entity.UserCredential;
import com.flowbi.domain.auth.persistence.repository.AuthUserRepository;
import com.flowbi.domain.auth.persistence.repository.UserCredentialRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class SyntheticAuthFixtureIntegrationTest {

  private static final String NORMAL_EMPLOYEE_NUMBER = "fixture-n-" + UUID.randomUUID();
  private static final String CHANGE_EMPLOYEE_NUMBER = "fixture-c-" + UUID.randomUUID();
  private static final String NORMAL_PASSWORD = "Aa!" + UUID.randomUUID();
  private static final String CHANGE_PASSWORD = "Bb!" + UUID.randomUUID();

  @Container
  static PostgreSQLContainer<?> postgresql = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url",postgresql::getJdbcUrl);
    registry.add("spring.datasource.username",postgresql::getUsername);
    registry.add("spring.datasource.password",postgresql::getPassword);
    registry.add("spring.datasource.driver-class-name",postgresql::getDriverClassName);
    registry.add("spring.jpa.database-platform",() -> "org.hibernate.dialect.PostgreSQLDialect");
    registry.add("spring.jpa.hibernate.ddl-auto",() -> "validate");
    registry.add("auth.test-fixtures.enabled",() -> true);
    registry.add("auth.test-fixtures.normal.employee-number",() -> NORMAL_EMPLOYEE_NUMBER);
    registry.add("auth.test-fixtures.normal.password",() -> NORMAL_PASSWORD);
    registry.add("auth.test-fixtures.password-change-required.employee-number",
        () -> CHANGE_EMPLOYEE_NUMBER);
    registry.add("auth.test-fixtures.password-change-required.password",() -> CHANGE_PASSWORD);
  }

  @Autowired
  private AuthUserRepository authUserRepository;

  @Autowired
  private UserCredentialRepository userCredentialRepository;

  @Autowired
  private SyntheticAuthFixtureInitializer initializer;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Test
  void createsHashedFixturesIdempotentlyAndRepairsAnIncompleteFixture() throws Exception {
    assertFixture(NORMAL_EMPLOYEE_NUMBER,NORMAL_PASSWORD,false);
    assertFixture(CHANGE_EMPLOYEE_NUMBER,CHANGE_PASSWORD,true);
    assertThat(authUserRepository.count()).isEqualTo(2);
    assertThat(userCredentialRepository.count()).isEqualTo(2);

    initializer.run(new DefaultApplicationArguments(new String[0]));

    assertThat(authUserRepository.count()).isEqualTo(2);
    assertThat(userCredentialRepository.count()).isEqualTo(2);

    AuthUser normalUser = authUserRepository.findByEmployeeNumber(NORMAL_EMPLOYEE_NUMBER)
        .orElseThrow();
    UserCredential normalCredential = userCredentialRepository
        .findByUserUserId(normalUser.getUserId()).orElseThrow();
    userCredentialRepository.delete(normalCredential);
    userCredentialRepository.flush();

    initializer.run(new DefaultApplicationArguments(new String[0]));

    assertFixture(NORMAL_EMPLOYEE_NUMBER,NORMAL_PASSWORD,false);
    assertThat(authUserRepository.count()).isEqualTo(2);
    assertThat(userCredentialRepository.count()).isEqualTo(2);
  }

  private void assertFixture(String employeeNumber,String plainPassword,
      boolean mustChangePassword) {
    AuthUser user = authUserRepository.findByEmployeeNumber(employeeNumber).orElseThrow();
    UserCredential credential = userCredentialRepository.findByUserUserId(user.getUserId())
        .orElseThrow();

    assertThat(credential.getPasswordHash()).isNotEqualTo(plainPassword);
    assertThat(passwordEncoder.matches(plainPassword,credential.getPasswordHash())).isTrue();
    assertThat(credential.isMustChangePassword()).isEqualTo(mustChangePassword);
  }
}
