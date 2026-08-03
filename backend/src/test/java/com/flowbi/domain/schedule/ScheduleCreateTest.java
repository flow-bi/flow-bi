package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ScheduleCreateTest {

  private static final Instant START = Instant.parse("2026-08-10T09:00:00Z");
  private static final Instant END = Instant.parse("2026-08-10T10:00:00Z");

  @Test
  void createsPersonalTeamAndProjectSchedulesWithTheirDefaultVisibility() {
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(List.of());
    ScheduleCreateService service = service(repository,10L,Set.of(100L),Set.of(200L),
        Set.of(20L,21L));

    ScheduleDetailResponse personal = service
        .create(request(ScheduleType.PERSONAL,List.of(),List.of(10L,20L,20L),true,false));
    ScheduleDetailResponse team = service.create(
        request(ScheduleType.TEAM,List.of(ScheduleTarget.team(100L)),List.of(20L),false,false));
    ScheduleDetailResponse project = service.create(request(ScheduleType.PROJECT,
        List.of(ScheduleTarget.project(200L)),List.of(21L),false,true));

    assertThat(personal.visibility()).isEqualTo(ScheduleVisibility.PRIVATE);
    assertThat(team.visibility()).isEqualTo(ScheduleVisibility.TEAM);
    assertThat(project.visibility()).isEqualTo(ScheduleVisibility.PROJECT);
    assertThat(personal.attendeeCount()).isEqualTo(2);
    assertThat(team.attendeeCount()).isEqualTo(1);
    assertThat(project.attendeeCount()).isEqualTo(1);
    assertThat(project.isAllDay()).isTrue();
  }

  @Test
  void createsARecordThatIsImmediatelyAvailableThroughTheExistingDetailQuery() {
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(List.of());
    ScheduleCreateService createService = service(repository,10L,Set.of(),Set.of(),Set.of(20L));

    ScheduleDetailResponse created = createService
        .create(request(ScheduleType.PERSONAL,List.of(),List.of(20L),true,false));
    ScheduleQueryService queryService = new ScheduleQueryService(repository, () -> Optional.of(10L),
        ScheduleMembershipReader.none());

    assertThat(queryService.getSchedule(created.scheduleId()).title()).isEqualTo("Planning");
  }

  private ScheduleCreateService service(InMemoryScheduleRepository repository,Long userId,
      Set<Long> teams,Set<Long> projects,Set<Long> activeUsers) {
    return new ScheduleCreateService(repository, () -> Optional.of(userId),
        new CreationMembershipReader(teams, projects), activeUsers::contains,
        ScheduleCreationAuditLogger.noop());
  }

  private ScheduleCreateRequest request(ScheduleType type,List<ScheduleTarget> targets,
      List<Long> attendeeIds,boolean creatorAttending,boolean allDay) {
    return new ScheduleCreateRequest("Planning", type, null, ScheduleColorLabel.BLUE, allDay, START,
        END, "Seoul", "Planning", targets, attendeeIds, creatorAttending);
  }
}

record CreationMembershipReader(Set<Long> teams,
    Set<Long> projects) implements ScheduleMembershipReader {
  @Override
  public boolean belongsToAnyTeam(Long userId,Set<Long> candidateTeamIds) {
    return teams.containsAll(candidateTeamIds);
  }

  @Override
  public boolean participatesInAnyProject(Long userId,Set<Long> candidateProjectIds) {
    return projects.containsAll(candidateProjectIds);
  }
}
