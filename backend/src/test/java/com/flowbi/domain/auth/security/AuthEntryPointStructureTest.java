package com.flowbi.domain.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RestController;

class AuthEntryPointStructureTest {

  private static final String AUTH_PACKAGE = "com.flowbi.domain.auth.";
  private static final Set<String> ALLOWED_PACKAGES = Set.of("audit","controller","dto","entity",
      "exception","fixture","repository","security","service");

  @Test
  void places_http_controllers_and_security_components_in_responsibility_packages() {
    assertThat(classIsPresent(AUTH_PACKAGE + "controller.LoginController")).isTrue();
    assertThat(classIsPresent(AUTH_PACKAGE + "controller.InitialPasswordChangeController"))
        .isTrue();
    assertThat(classIsPresent(AUTH_PACKAGE + "controller.SessionStatusController")).isTrue();
    assertThat(classIsPresent(AUTH_PACKAGE + "controller.CsrfTokenController")).isTrue();
    assertThat(classIsPresent(AUTH_PACKAGE + "security.LoginPrincipal")).isTrue();
    assertThat(classIsPresent(AUTH_PACKAGE + "security.MustChangePasswordFilter")).isTrue();
    assertThat(classIsPresent(AUTH_PACKAGE + "security.SessionGenerationValidationFilter"))
        .isTrue();
    assertThat(classIsPresent(AUTH_PACKAGE + "security.LogoutHandler")).isTrue();
    assertThat(classIsPresent(AUTH_PACKAGE + "security.LogoutSuccessHandler")).isTrue();

    assertThat(classIsPresent(AUTH_PACKAGE + "login.LoginController")).isFalse();
    assertThat(classIsPresent(AUTH_PACKAGE + "password.InitialPasswordChangeController")).isFalse();
    assertThat(classIsPresent(AUTH_PACKAGE + "session.SessionStatusController")).isFalse();
    assertThat(classIsPresent(AUTH_PACKAGE + "security.CsrfTokenController")).isFalse();
    assertThat(classIsPresent(AUTH_PACKAGE + "login.LoginPrincipal")).isFalse();
    assertThat(classIsPresent(AUTH_PACKAGE + "password.MustChangePasswordFilter")).isFalse();
    assertThat(classIsPresent(AUTH_PACKAGE + "session.SessionGenerationValidationFilter"))
        .isFalse();
    assertThat(classIsPresent(AUTH_PACKAGE + "logout.LogoutHandler")).isFalse();
    assertThat(classIsPresent(AUTH_PACKAGE + "logout.LogoutSuccessHandler")).isFalse();
  }

  @Test
  void prevents_controller_repository_and_service_foreign_repository_dependencies()
      throws ClassNotFoundException {
    List<String> controllerNames = List.of("controller.LoginController",
        "controller.InitialPasswordChangeController","controller.SessionStatusController",
        "controller.CsrfTokenController");
    for (String controllerName : controllerNames) {
      Class<?> controller = Class.forName(AUTH_PACKAGE + controllerName);
      assertThat(controller.isAnnotationPresent(RestController.class)).isTrue();
      assertThat(fieldTypeNames(controller))
          .noneMatch(name -> name.startsWith(AUTH_PACKAGE + "repository."));
    }

    List<String> serviceNames = List.of("service.LoginAuthenticationService",
        "service.InitialPasswordChangeService","service.SessionGenerationService",
        "service.SessionIndexCleanup","service.PasswordPolicy");
    for (String serviceName : serviceNames) {
      assertThat(fieldTypeNames(Class.forName(AUTH_PACKAGE + serviceName))).noneMatch(name -> name
          .matches("com\\.flowbi\\.domain\\.(?!auth\\.repository).*\\.repository\\..*"));
    }
  }

  @Test
  void limits_production_auth_packages_and_prevents_entity_api_exposure()
      throws IOException, ClassNotFoundException {
    try (var sourceFiles = Files.walk(Path.of("src/main/java/com/flowbi/domain/auth"))) {
      assertThat(sourceFiles.filter(path -> path.toString().endsWith(".java"))
          .map(this::topLevelPackage).distinct()).containsOnlyElementsOf(ALLOWED_PACKAGES);
    }

    Class<?> userCredential = Class.forName(AUTH_PACKAGE + "entity.UserCredential");
    assertThat(userCredential.isAnnotationPresent(RestController.class)).isFalse();
    assertThat(java.util.Arrays.stream(userCredential.getAnnotations())
        .map(annotation -> annotation.annotationType().getPackageName()))
        .noneMatch(name -> name.startsWith("org.springframework.web."));
  }

  private boolean classIsPresent(String typeName) {
    try {
      Class.forName(typeName);
      return true;
    } catch (ClassNotFoundException exception) {
      return false;
    }
  }

  private java.util.stream.Stream<String> fieldTypeNames(Class<?> type) {
    return java.util.Arrays.stream(type.getDeclaredFields()).map(Field::getType)
        .map(Class::getName);
  }

  private String topLevelPackage(Path sourceFile) {
    Path root = Path.of("src/main/java/com/flowbi/domain/auth");
    return root.relativize(sourceFile).getName(0).toString();
  }
}
