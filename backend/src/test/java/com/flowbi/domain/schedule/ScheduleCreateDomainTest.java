package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ScheduleCreateDomainTest {

  private static final OffsetDateTime START = OffsetDateTime.parse("2026-08-10T09:00:00+09:00");

  @Test
  void rejectsAnEmptyTimeInterval() {
    assertThatThrownBy(() -> ScheduleCreateCommand.of(1L,"Planning",ScheduleType.PERSONAL,
        ScheduleVisibility.PRIVATE,START,START,false,ScheduleColorLabel.BLUE,null,null,true,
        List.of(),List.of(),List.of(),List.of()))
        .isInstanceOf(InvalidScheduleCreateCommandException.class);
  }

  @Test
  void rejectsTypeVisibilityAndTargetMismatches() {
    assertThatThrownBy(() -> ScheduleCreateCommand.of(1L,"Planning",ScheduleType.TEAM,
        ScheduleVisibility.PRIVATE,START,START.plusHours(1),false,ScheduleColorLabel.BLUE,null,null,
        true,List.of(),List.of(),List.of(),List.of()))
        .isInstanceOf(InvalidScheduleCreateCommandException.class);
  }

  @Test
  void rejectsDuplicateParticipantIdsAndAnUnknownColorLabel() {
    assertThatThrownBy(() -> ScheduleCreateCommand.of(1L,"Planning",ScheduleType.PERSONAL,
        ScheduleVisibility.PRIVATE,START,START.plusHours(1),false,null,null,null,true,
        List.of(2L,2L),List.of(),List.of(),List.of()))
        .isInstanceOf(InvalidScheduleCreateCommandException.class);
  }
}
