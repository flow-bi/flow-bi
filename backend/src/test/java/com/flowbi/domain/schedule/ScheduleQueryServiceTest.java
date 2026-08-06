package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.schedule.port.ScheduleAudienceLookup;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ScheduleQueryServiceTest {

  private static final OffsetDateTime FROM = OffsetDateTime.parse("2026-08-01T00:00:00+09:00");
  private static final OffsetDateTime TO = OffsetDateTime.parse("2026-09-01T00:00:00+09:00");

  @Test
  void returnsOnlySchedulesVisibleToTheActorAndUsesOneAudienceLookupPerTargetKind() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleAudienceLookup audienceLookup = mock(ScheduleAudienceLookup.class);
    ScheduleQueryService service = new ScheduleQueryService(repository, audienceLookup);
    Schedule personal = schedule(1L,ScheduleType.PERSONAL,List.of(7L),List.of(),List.of());
    Schedule team = schedule(3L,ScheduleType.TEAM,List.of(),List.of(10L,11L),List.of());
    Schedule project = schedule(4L,ScheduleType.PROJECT,List.of(),List.of(),List.of(20L,21L));
    Schedule hidden = schedule(9L,ScheduleType.PERSONAL,List.of(),List.of(),List.of());
    when(repository.findActiveOverlappingWithAssociations(FROM,TO))
        .thenReturn(List.of(personal,team,project,hidden));
    when(audienceLookup.memberTeamIds(7L,Set.of(10L,11L))).thenReturn(Set.of(11L));
    when(audienceLookup.memberProjectIds(7L,Set.of(20L,21L))).thenReturn(Set.of(20L));

    List<ScheduleListItem> result = service.query(ScheduleQuery.of(7L,FROM,TO));

    assertThat(result).extracting(ScheduleListItem::title).containsExactly("PERSONAL 1","TEAM 3",
        "PROJECT 4");
    verify(repository).findActiveOverlappingWithAssociations(FROM,TO);
    verify(audienceLookup).memberTeamIds(7L,Set.of(10L,11L));
    verify(audienceLookup).memberProjectIds(7L,Set.of(20L,21L));
  }

  @Test
  void acceptsSchedulesThatCrossEitherPeriodBoundary() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleAudienceLookup audienceLookup = mock(ScheduleAudienceLookup.class);
    ScheduleQueryService service = new ScheduleQueryService(repository, audienceLookup);
    Schedule crossingStart = schedule(7L,ScheduleType.PERSONAL,List.of(),List.of(),List.of());
    when(repository.findActiveOverlappingWithAssociations(FROM,TO))
        .thenReturn(List.of(crossingStart));
    when(audienceLookup.memberTeamIds(7L,Set.of())).thenReturn(Set.of());
    when(audienceLookup.memberProjectIds(7L,Set.of())).thenReturn(Set.of());

    assertThat(service.query(ScheduleQuery.of(7L,FROM,TO))).hasSize(1);
  }

  @Test
  void rejectsInvalidAndUnboundedPeriodsBeforeCallingTheRepository() {
    assertThatThrownBy(() -> ScheduleQuery.of(7L,TO,FROM))
        .isInstanceOf(InvalidScheduleQueryException.class);
    assertThatThrownBy(() -> ScheduleQuery.of(7L,FROM,FROM.plusDays(32)))
        .isInstanceOf(InvalidScheduleQueryException.class);
  }

  private Schedule schedule(long creatorId,ScheduleType type,List<Long> participantIds,
      List<Long> teamIds,List<Long> projectIds) {
    return Schedule.create(ScheduleCreateCommand.of(creatorId,type + " " + creatorId,type,
        ScheduleVisibility.defaultFor(type),FROM.minusHours(1),TO.plusHours(1),false,
        ScheduleColorLabel.BLUE,"private content","Room A",false,participantIds,List.of(),teamIds,
        projectIds));
  }
}
