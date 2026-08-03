package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ScheduleAuthorizationTest {

  private static final Instant FROM = Instant.parse("2026-08-01T00:00:00Z");
  private static final Instant TO = Instant.parse("2026-08-02T00:00:00Z");

  @Test
  void deniesUnauthenticatedRequestsByDefault() {
    ScheduleQueryService service = new ScheduleQueryService(
        new InMemoryScheduleRepository(List.of(ScheduleFixtures.personal(1L,10L,FROM,TO))),
        ScheduleUserProvider.unauthenticated(), ScheduleMembershipReader.none());

    assertThatThrownBy(() -> service.getSchedules(FROM,TO))
        .isInstanceOf(ScheduleAuthenticationRequiredException.class);
  }

  @Test
  void deniesUnauthenticatedRequestsBeforeValidatingQueryDetails() {
    ScheduleQueryService service = new ScheduleQueryService(
        new InMemoryScheduleRepository(List.of()), ScheduleUserProvider.unauthenticated(),
        ScheduleMembershipReader.none());

    assertThatThrownBy(() -> service.getSchedules(TO,FROM))
        .isInstanceOf(ScheduleAuthenticationRequiredException.class);
  }

  @Test
  void appliesPersonalTeamAndProjectVisibilityRulesIncludingAttendees() {
    Schedule personal = ScheduleFixtures.personal(1L,10L,FROM,TO);
    Schedule team = ScheduleFixtures.team(2L,20L,100L,FROM,TO);
    Schedule project = ScheduleFixtures.project(3L,30L,200L,FROM,TO);
    Schedule attendedPersonal = ScheduleFixtures.personalWithAttendee(4L,40L,99L,FROM,TO);
    Schedule attendedTeam = ScheduleFixtures.teamWithAttendee(5L,40L,101L,99L,FROM,TO);
    Schedule attendedProject = ScheduleFixtures.projectWithAttendee(6L,40L,201L,99L,FROM,TO);
    List<Schedule> schedules = List.of(personal,team,project,attendedPersonal,attendedTeam,
        attendedProject);

    assertThat(ScheduleFixtures.serviceFor(10L,schedules).getSchedules(FROM,TO))
        .extracting(ScheduleListItemResponse::scheduleId).containsExactly(1L);
    assertThat(ScheduleFixtures.serviceFor(99L,schedules).getSchedules(FROM,TO))
        .extracting(ScheduleListItemResponse::scheduleId).containsExactly(4L,5L,6L);
    assertThat(ScheduleFixtures.serviceForTeamMember(77L,100L,schedules).getSchedules(FROM,TO))
        .extracting(ScheduleListItemResponse::scheduleId).containsExactly(2L);
    assertThat(ScheduleFixtures.serviceForProjectMember(88L,200L,schedules).getSchedules(FROM,TO))
        .extracting(ScheduleListItemResponse::scheduleId).containsExactly(3L);
    assertThat(ScheduleFixtures.serviceFor(20L,schedules).getSchedules(FROM,TO))
        .extracting(ScheduleListItemResponse::scheduleId).doesNotContain(2L);
  }

  @Test
  void preventsIdorByReturningTheSameSafeNotFoundForMissingAndInaccessibleSchedules() {
    ScheduleQueryService service = ScheduleFixtures.serviceFor(99L,
        List.of(ScheduleFixtures.personal(1L,10L,FROM,TO)));

    assertThatThrownBy(() -> service.getSchedule(1L)).isInstanceOf(ScheduleNotFoundException.class)
        .hasMessage("Schedule not found");
    assertThatThrownBy(() -> service.getSchedule(999L))
        .isInstanceOf(ScheduleNotFoundException.class).hasMessage("Schedule not found");
  }

  @Test
  void failsClosedWhenATypedScheduleHasNoMatchingShareTarget() {
    Schedule teamWithoutTeamTarget = new Schedule(1L, "Planning", ScheduleType.TEAM,
        ScheduleVisibility.TEAM, ScheduleColorLabel.BLUE, false, FROM, TO, 10L,
        new ScheduleDetail("Seoul", "Planning"), List.of(ScheduleTarget.project(200L)), List.of(),
        true, false);
    ScheduleQueryService service = new ScheduleQueryService(
        new InMemoryScheduleRepository(List.of(teamWithoutTeamTarget)),
        () -> java.util.Optional.of(99L), new ScheduleMembershipReader() {
          @Override
          public boolean belongsToAnyTeam(Long userId,java.util.Set<Long> teamIds) {
            return true;
          }

          @Override
          public boolean participatesInAnyProject(Long userId,java.util.Set<Long> projectIds) {
            return true;
          }
        });

    assertThat(service.getSchedules(FROM,TO)).isEmpty();
  }

  @Test
  void usesTheAuthenticatedSubjectAsTheCreatorBecauseTheRequestHasNoCreatorId() {
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(List.of());
    ScheduleCreateService service = new ScheduleCreateService(repository, () -> Optional.of(10L),
        ScheduleMembershipReader.none(), ScheduleActiveUserReader.none(),
        ScheduleCreationAuditLogger.noop());

    service.create(new ScheduleCreateRequest("Planning", ScheduleType.PERSONAL, null,
        ScheduleColorLabel.BLUE, false, FROM, TO, "Seoul", "Details", List.of(), List.of(), false));

    assertThat(repository.findById(1L).orElseThrow().getCreatorId()).isEqualTo(10L);
  }

  @Test
  void preventsIdorForUpdateAndDeleteWithTheSameSafeNotFoundOutcome() {
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(
        List.of(ScheduleFixtures.personal(1L,10L,FROM,TO)));
    ScheduleUpdateService updateService = new ScheduleUpdateService(repository,
        () -> Optional.of(99L), ScheduleMembershipReader.none(), ScheduleActiveUserReader.none(),
        ScheduleChangeAuditLogger.noop());
    ScheduleDeleteService deleteService = new ScheduleDeleteService(repository,
        () -> Optional.of(99L), ScheduleChangeAuditLogger.noop());
    ScheduleUpdateRequest request = new ScheduleUpdateRequest("Changed", ScheduleType.PERSONAL,
        null, ScheduleColorLabel.RED, false, FROM, TO, "Seoul", "Changed", List.of(), List.of(),
        false);

    assertThatThrownBy(() -> updateService.update(1L,request))
        .isInstanceOf(ScheduleNotFoundException.class).hasMessage("Schedule not found");
    assertThatThrownBy(() -> updateService.update(999L,request))
        .isInstanceOf(ScheduleNotFoundException.class).hasMessage("Schedule not found");
    assertThatThrownBy(() -> deleteService.delete(1L)).isInstanceOf(ScheduleNotFoundException.class)
        .hasMessage("Schedule not found");
    assertThatThrownBy(() -> deleteService.delete(999L))
        .isInstanceOf(ScheduleNotFoundException.class).hasMessage("Schedule not found");
  }

  @Test
  void deniesUnauthenticatedUpdateAndDeleteRequests() {
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(
        List.of(ScheduleFixtures.personal(1L,10L,FROM,TO)));
    ScheduleUpdateService updateService = new ScheduleUpdateService(repository,
        ScheduleUserProvider.unauthenticated(), ScheduleMembershipReader.none(),
        ScheduleActiveUserReader.none(), ScheduleChangeAuditLogger.noop());
    ScheduleDeleteService deleteService = new ScheduleDeleteService(repository,
        ScheduleUserProvider.unauthenticated(), ScheduleChangeAuditLogger.noop());
    ScheduleUpdateRequest request = new ScheduleUpdateRequest("Changed", ScheduleType.PERSONAL,
        null, ScheduleColorLabel.RED, false, FROM, TO, "Seoul", "Changed", List.of(), List.of(),
        false);

    assertThatThrownBy(() -> updateService.update(1L,request))
        .isInstanceOf(ScheduleAuthenticationRequiredException.class);
    assertThatThrownBy(() -> deleteService.delete(1L))
        .isInstanceOf(ScheduleAuthenticationRequiredException.class);
  }
}
