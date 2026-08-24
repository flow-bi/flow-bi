package com.flowbi.domain.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.junit.jupiter.api.Test;

class SyntheticAuthRemovalTest {

  private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
      .withUserConfiguration(EmptyConfiguration.class);

  @Test
  void noSyntheticInitializerClassRemains() {
    assertThat(org.assertj.core.api.Assertions.catchThrowable(
        () -> Class.forName("com.flowbi.domain.auth.fixture.SyntheticAuthFixtureInitializer")))
        .isInstanceOf(ClassNotFoundException.class);
  }

  @Test
  void legacyFixturePropertiesDoNotRegisterAnInitializerOrApplicationRunner() {
    contextRunner
        .withPropertyValues("auth.test-fixtures.enabled=true","AUTH_TEST_FIXTURES_ENABLED=true")
        .run(context -> assertThat(context.getBeansOfType(ApplicationRunner.class)).isEmpty());
  }

  @Test
  void documentsThatDevelopmentAccountCreationIsNotAStartupFixture() throws IOException {
    assertThat(Files.readString(Path.of("DB_SCHEMA.md")))
        .contains("Development account creation is not a migration or a startup fixture.");
  }

  @Test
  void attendeeSearchMigrationContainsNoAuthenticationOrAuthorizationData() throws IOException {
    String migration = Files.readString(Path.of("src/main/resources/db/migration/"
        + "V20260823081843_00__user_insert_calendar_attendee_test_data.sql"));

    assertThat(migration).doesNotContain("user_credentials","password","role","token","session");
  }

  @Configuration(proxyBeanMethods = false)
  static class EmptyConfiguration {
  }
}
