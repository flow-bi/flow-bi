package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class ScheduleQueryTest {

  private static final Instant FROM = Instant.parse("2026-08-01T00:00:00Z");
  private static final Instant TO = Instant.parse("2026-09-01T00:00:00Z");

  @Test
  void returnsOnlyAccessibleActiveSchedulesOverlappingTheRequestedPeriod() {
    Schedule overlappingAtStart = ScheduleFixtures.personal(1L,10L,FROM.minusSeconds(1),
        FROM.plusSeconds(1));
    Schedule overlappingAtEnd = ScheduleFixtures.personal(2L,10L,TO.minusSeconds(1),
        TO.plusSeconds(1));
    Schedule endingAtFrom = ScheduleFixtures.personal(3L,10L,FROM.minusSeconds(2),FROM);
    Schedule startingAtTo = ScheduleFixtures.personal(4L,10L,TO,TO.plusSeconds(2));
    Schedule cancelled = ScheduleFixtures.cancelledPersonal(5L,10L,FROM.plusSeconds(1),
        TO.minusSeconds(1));

    ScheduleQueryService service = ScheduleFixtures.serviceFor(10L,
        List.of(overlappingAtStart,overlappingAtEnd,endingAtFrom,startingAtTo,cancelled));

    List<ScheduleListItemResponse> response = service.getSchedules(FROM,TO);

    assertThat(response).extracting(ScheduleListItemResponse::scheduleId).containsExactly(1L,2L);
    assertThat(response.get(0).colorLabel()).isEqualTo(ScheduleColorLabel.BLUE);
    assertThat(response.get(0).isAllDay()).isFalse();
  }

  @Test
  void returnsEmptyListWhenNoActiveAccessibleScheduleOverlapsADayOrWeekOrMonthRange() {
    Schedule outside = ScheduleFixtures.personal(1L,10L,TO,TO.plusSeconds(3600));
    ScheduleQueryService service = ScheduleFixtures.serviceFor(10L,List.of(outside));

    assertThat(service.getSchedules(FROM,TO)).isEmpty();
    assertThat(service.getSchedules(FROM,FROM.plusSeconds(86400))).isEmpty();
    assertThat(service.getSchedules(FROM,FROM.plusSeconds(604800))).isEmpty();
  }

  @Test
  void rejectsAVisibilityThatDoesNotMatchTheScheduleType() {
    assertThatThrownBy(
        () -> new Schedule(1L, "Planning", ScheduleType.TEAM, ScheduleVisibility.PRIVATE,
            ScheduleColorLabel.BLUE, false, FROM, TO, 10L, new ScheduleDetail("Seoul", "Planning"),
            List.of(ScheduleTarget.team(100L)), List.of(), true, false))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("visibility must match schedule type");
  }

  @Test
  void failsClosedWhenATypeHasMixedShareTargets() {
    Schedule mixedTargets = new Schedule(1L, "Planning", ScheduleType.TEAM, ScheduleVisibility.TEAM,
        ScheduleColorLabel.BLUE, false, FROM, TO, 10L, new ScheduleDetail("Seoul", "Planning"),
        List.of(ScheduleTarget.team(100L),ScheduleTarget.project(200L)), List.of(), true, false);
    ScheduleQueryService service = ScheduleFixtures.serviceForTeamMember(20L,100L,
        List.of(mixedTargets));

    assertThat(service.getSchedules(FROM,TO)).isEmpty();
  }

  @Test
  void rejectsMissingPeriodBoundariesWithAValidationError() {
    ScheduleQueryService service = ScheduleFixtures.serviceFor(10L,List.of());

    assertThatThrownBy(() -> service.getSchedules(null,TO))
        .isInstanceOf(IllegalArgumentException.class).hasMessage("from and to are required");
    assertThatThrownBy(() -> service.getSchedules(FROM,null))
        .isInstanceOf(IllegalArgumentException.class).hasMessage("from and to are required");
  }
}
