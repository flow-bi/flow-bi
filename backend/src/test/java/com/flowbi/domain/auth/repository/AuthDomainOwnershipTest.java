package com.flowbi.domain.auth.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.auth.service.LoginAuthenticationService;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class AuthDomainOwnershipTest {

  @Test
  void authPersistenceTypesFollowEntityAndRepositoryResponsibilities() {
    assertThat(classIsPresent("com.flowbi.domain.auth.entity.UserCredential")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.repository.UserCredentialRepository"))
        .isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.repository.SessionGenerationStore")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.repository.RedisSessionGenerationStore"))
        .isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.repository.LoginRateLimiter")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.repository.RedisLoginRateLimiter")).isTrue();
    assertThat(classIsPresent(legacyPersistenceType("entity.UserCredential"))).isFalse();
    assertThat(classIsPresent(legacyPersistenceType("repository.UserCredentialRepository")))
        .isFalse();
  }

  @Test
  void authDoesNotOwnOrganizationPersistenceTypesOrInjectAUserRepository() {
    assertThat(classIsPresent("com.flowbi.domain.auth.entity.AuthUser")).isFalse();
    assertThat(classIsPresent("com.flowbi.domain.auth.entity.Position")).isFalse();
    assertThat(classIsPresent("com.flowbi.domain.auth.entity.Team")).isFalse();
    assertThat(classIsPresent("com.flowbi.domain.auth.repository.AuthUserRepository")).isFalse();
    assertThat(classIsPresent("com.flowbi.domain.auth.repository.PositionRepository")).isFalse();
    assertThat(classIsPresent("com.flowbi.domain.auth.repository.TeamRepository")).isFalse();
    assertThat(Arrays.stream(LoginAuthenticationService.class.getDeclaredFields())
        .map(field -> field.getType().getName()))
        .noneMatch(name -> name.startsWith("com.flowbi.domain.user.repository."))
        .noneMatch(name -> name.startsWith("com.flowbi.domain.team.repository."))
        .noneMatch(name -> name.startsWith("com.flowbi.domain.position.repository."));
  }

  private boolean classIsPresent(String name) {
    try {
      Class.forName(name);
      return true;
    } catch (ClassNotFoundException exception) {
      return false;
    }
  }

  private String legacyPersistenceType(String type) {
    return "com.flowbi.domain.auth." + "persistence." + type;
  }
}
