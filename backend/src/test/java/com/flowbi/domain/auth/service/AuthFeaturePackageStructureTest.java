package com.flowbi.domain.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Constructor;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class AuthFeaturePackageStructureTest { // Feature ownership contract.

  @Test
  void places_types_in_feature_packages_and_removes_legacy_packages() {
    assertThat(classIsPresent("com.flowbi.domain.auth.login.LoginController")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.login.LoginAuthenticationService")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.login.LoginRequest")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.login.LoginResult")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.login.AuthenticatedLogin")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.login.AuthenticationDependencyUnavailableException"))
        .isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.login.ratelimit.LoginRateLimiter")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.login.ratelimit.RedisLoginRateLimiter")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.login.ratelimit.LoginRateLimitUnavailableException"))
        .isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.password.InitialPasswordChangeController")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.password.InitialPasswordChangeService")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.password.PasswordChangeRequest")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.password.PasswordPolicy")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.password.MustChangePasswordFilter")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.session.SessionStatusController")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.session.SessionGenerationService")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.credential.UserCredential")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.credential.UserCredentialRepository")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.dev.DevEmployeeAccountController")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.security.CsrfTokenController")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.LoginAuditLogger")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.Slf4jLoginAuditLogger")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.PasswordChangeAuditLogger")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.Slf4jPasswordChangeAuditLogger"))
        .isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.LogoutAuditLogger")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.Slf4jLogoutAuditLogger")).isTrue();
    for (String legacyPackage : new String[] {"controller", "service", "dto", "entity",
        "repository", "exception", "ratelimit"}) {
      assertThat(classIsPresent("com.flowbi.domain.auth." + legacyPackage + ".LoginController"))
          .isFalse();
    }
  }

  @Test
  void keeps_controller_service_repository_dependency_direction() throws Exception {
    assertThat(hasConstructorDependency("com.flowbi.domain.auth.login.LoginController",
        "com.flowbi.domain.auth.login.LoginAuthenticationService")).isTrue();
    assertThat(hasConstructorDependency(
        "com.flowbi.domain.auth.password.InitialPasswordChangeController",
        "com.flowbi.domain.auth.password.InitialPasswordChangeService")).isTrue();
    assertThat(hasConstructorDependency("com.flowbi.domain.auth.login.LoginAuthenticationService",
        "com.flowbi.domain.auth.credential.UserCredentialRepository")).isTrue();
    assertThat(
        hasConstructorDependency("com.flowbi.domain.auth.password.InitialPasswordChangeService",
            "com.flowbi.domain.auth.credential.UserCredentialRepository"))
        .isTrue();
    assertThat(hasConstructorDependency("com.flowbi.domain.auth.session.SessionGenerationService",
        "com.flowbi.domain.auth.session.SessionGenerationStore")).isTrue();
  }

  private boolean hasConstructorDependency(String ownerTypeName,String dependencyTypeName)
      throws ClassNotFoundException {
    Class<?> ownerType = Class.forName(ownerTypeName);
    return Arrays.stream(ownerType.getConstructors()).map(Constructor::getParameterTypes)
        .flatMap(Arrays::stream).map(Class::getName).anyMatch(dependencyTypeName::equals);
  }

  private boolean classIsPresent(String typeName) {
    try {
      Class.forName(typeName);
      return true;
    } catch (ClassNotFoundException exception) {
      return false;
    }
  }
}
