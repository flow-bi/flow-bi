package com.flowbi.domain.auth.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.auth.login.LoginAuthenticationService;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class AuthDomainOwnershipTest {

  @Test
  void authDoesNotOwnOrganizationPersistenceTypesOrInjectAUserRepository() {
    assertThat(classIsPresent("com.flowbi.domain.auth.persistence.entity.AuthUser")).isFalse();
    assertThat(classIsPresent("com.flowbi.domain.auth.persistence.entity.Position")).isFalse();
    assertThat(classIsPresent("com.flowbi.domain.auth.persistence.entity.Team")).isFalse();
    assertThat(classIsPresent("com.flowbi.domain.auth.persistence.repository.AuthUserRepository"))
        .isFalse();
    assertThat(classIsPresent("com.flowbi.domain.auth.persistence.repository.PositionRepository"))
        .isFalse();
    assertThat(classIsPresent("com.flowbi.domain.auth.persistence.repository.TeamRepository"))
        .isFalse();
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
}
