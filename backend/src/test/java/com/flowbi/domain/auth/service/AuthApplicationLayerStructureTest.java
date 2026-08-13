package com.flowbi.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Constructor;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class AuthApplicationLayerStructureTest {

  @Test
  void places_application_types_in_responsibility_packages() {
    assertThat(classIsPresent("com.flowbi.domain.auth.service.LoginAuthenticationService"))
        .isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.service.InitialPasswordChangeService"))
        .isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.service.SessionGenerationService")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.service.SessionIndexCleanup")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.service.PasswordPolicy")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.dto.LoginRequest")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.dto.LoginResult")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.dto.AuthenticatedLogin")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.dto.PasswordChangeRequest")).isTrue();
    assertThat(classIsPresent(
        "com.flowbi.domain.auth.exception.AuthenticationDependencyUnavailableException")).isTrue();
    assertThat(
        classIsPresent("com.flowbi.domain.auth.exception.LoginRateLimitUnavailableException"))
        .isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.exception.PasswordChangeException")).isTrue();
    assertThat(classIsPresent(
        "com.flowbi.domain.auth.exception.PasswordChangeDependencyUnavailableException")).isTrue();
    assertThat(
        classIsPresent("com.flowbi.domain.auth.exception.SessionGenerationValidationException"))
        .isTrue();
    assertThat(classIsPresent(
        "com.flowbi.domain.auth.exception.SessionGenerationStoreUnavailableException")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.LoginAuditLogger")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.Slf4jLoginAuditLogger")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.PasswordChangeAuditLogger")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.Slf4jPasswordChangeAuditLogger"))
        .isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.LogoutAuditLogger")).isTrue();
    assertThat(classIsPresent("com.flowbi.domain.auth.audit.Slf4jLogoutAuditLogger")).isTrue();
  }

  @Test
  void keeps_controller_service_repository_dependency_direction() throws Exception {
    assertThat(hasConstructorDependency("com.flowbi.domain.auth.controller.LoginController",
        "com.flowbi.domain.auth.service.LoginAuthenticationService")).isTrue();
    assertThat(hasConstructorDependency(
        "com.flowbi.domain.auth.controller.InitialPasswordChangeController",
        "com.flowbi.domain.auth.service.InitialPasswordChangeService")).isTrue();
    assertThat(hasConstructorDependency("com.flowbi.domain.auth.service.LoginAuthenticationService",
        "com.flowbi.domain.auth.repository.UserCredentialRepository")).isTrue();
    assertThat(
        hasConstructorDependency("com.flowbi.domain.auth.service.InitialPasswordChangeService",
            "com.flowbi.domain.auth.repository.UserCredentialRepository"))
        .isTrue();
    assertThat(hasConstructorDependency("com.flowbi.domain.auth.service.SessionGenerationService",
        "com.flowbi.domain.auth.repository.SessionGenerationStore")).isTrue();
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
