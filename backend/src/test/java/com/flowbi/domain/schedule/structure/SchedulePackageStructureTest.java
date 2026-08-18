package com.flowbi.domain.schedule.structure;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class SchedulePackageStructureTest {

  @Test
  void scheduleTypesAreOwnedByTheirResponsibilityPackages() {
    List<String> expectedTypes = List.of("controller.ScheduleController",
        "controller.ScheduleControllerAdvice","dto.ScheduleCreateCommand",
        "dto.ScheduleUpdateCommand","dto.ScheduleQuery","dto.ScheduleDetailResponse",
        "dto.ScheduleListItem","dto.AttendeeCandidate","dto.AttendeeCandidates",
        "dto.ScheduleWriteRequest","service.ScheduleCreateService",
        "service.ScheduleCreateTransaction","service.ScheduleQueryService",
        "service.ScheduleDetailService","service.ScheduleUpdateService",
        "service.ScheduleUpdateTransaction","service.ScheduleCancelService",
        "service.ScheduleCancelTransaction","service.ScheduleIdentityService","entity.Schedule",
        "entity.ScheduleDetail","entity.ScheduleParticipant","entity.ScheduleTarget",
        "entity.ScheduleType","entity.ScheduleVisibility","entity.ScheduleStatus",
        "entity.ScheduleColorLabel","entity.ScheduleTargetType","repository.ScheduleRepository",
        "repository.JdbcScheduleIdentityAdapter","repository.ScheduleIntegrationConfiguration",
        "audit.ScheduleAuditEvent","audit.ScheduleAuditResult",
        "exception.InvalidAttendeeQueryException","exception.InvalidScheduleCreateCommandException",
        "exception.InvalidScheduleQueryException","exception.InvalidScheduleUpdateCommandException",
        "exception.RoomReservationManagedScheduleException",
        "exception.ScheduleActorInactiveException","exception.ScheduleNotFoundException",
        "port.InvalidScheduleReferenceException","port.ScheduleAudienceLookup",
        "port.ScheduleAuditWriter","port.ScheduleReferenceValidator",
        "port.ScheduleRoomReservationLookup");

    assertThat(expectedTypes).allSatisfy(type -> assertThat(load(type).getPackageName())
        .isEqualTo("com.flowbi.domain.schedule." + type.substring(0,type.indexOf('.'))));
    assertThat(rootJavaTypes()).isEmpty();
  }

  @Test
  void controllerDependsOnScheduleServicesInsteadOfPersistenceTypes() {
    assertThat(load("controller.ScheduleController").getDeclaredFields())
        .allSatisfy(field -> assertThat(field.getType().getPackageName())
            .isEqualTo("com.flowbi.domain.schedule.service"));
  }

  private List<Path> rootJavaTypes() {
    Path root = Path.of("src/main/java/com/flowbi/domain/schedule");
    try (var paths = Files.list(root)) {
      return paths.filter(path -> path.getFileName().toString().endsWith(".java")).toList();
    } catch (IOException exception) {
      throw new AssertionError("cannot inspect schedule root package", exception);
    }
  }

  private Class<?> load(String type) {
    try {
      return Class.forName("com.flowbi.domain.schedule." + type);
    } catch (ClassNotFoundException exception) {
      throw new AssertionError("missing schedule type: " + type, exception);
    }
  }
}
