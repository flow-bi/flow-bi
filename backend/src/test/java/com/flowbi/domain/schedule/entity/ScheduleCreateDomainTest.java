package com.flowbi.domain.schedule.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.flowbi.domain.schedule.dto.ScheduleCreateCommand;
import com.flowbi.domain.schedule.dto.ScheduleUpdateCommand;
import com.flowbi.domain.schedule.exception.InvalidScheduleCreateCommandException;
import com.flowbi.domain.schedule.exception.InvalidScheduleUpdateCommandException;
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

  @Test
  void normalizesNullableListsAndRejectsInvalidTargetIdsWithTheCommandSpecificException() {
    ScheduleCreateCommand created = ScheduleCreateCommand.of(1L,"Planning",ScheduleType.PERSONAL,
        ScheduleVisibility.PRIVATE,START,START.plusHours(1),false,ScheduleColorLabel.BLUE,null,null,
        true,null,null,null,null);

    assertThat(created.participantIds()).isEmpty();
    assertThatThrownBy(() -> ScheduleUpdateCommand.of("Planning",ScheduleType.TEAM,
        ScheduleVisibility.TEAM,START,START.plusHours(1),false,ScheduleColorLabel.BLUE,null,null,
        true,List.of(),List.of(),List.of(-1L),List.of()))
        .isInstanceOf(InvalidScheduleUpdateCommandException.class)
        .hasMessage("teamTargetIds must contain positive IDs");
  }

  @Test
  void replacesParticipantsAndTargetsWithoutCountingTheCreatorTwice() {
    Schedule schedule = Schedule.create(ScheduleCreateCommand.of(1L,"Planning",ScheduleType.TEAM,
        ScheduleVisibility.TEAM,START,START.plusHours(1),false,ScheduleColorLabel.BLUE,null,null,
        true,List.of(1L,2L),List.of(3L),List.of(10L),List.of()));

    schedule
        .update(ScheduleUpdateCommand.of("Updated",ScheduleType.PROJECT,ScheduleVisibility.PROJECT,
            START.plusDays(1),START.plusDays(1).plusHours(1),false,ScheduleColorLabel.GREEN,
            "Content","Location",true,List.of(1L,4L),List.of(5L),List.of(),List.of(20L)));

    assertThat(schedule.attendeeCount()).isEqualTo(2);
    assertThat(schedule.getParticipants()).extracting(ScheduleParticipant::getUserId)
        .containsExactly(1L,4L);
    assertThat(schedule.getTargets()).extracting(ScheduleTarget::getType)
        .containsExactlyInAnyOrder(ScheduleTargetType.USER,ScheduleTargetType.PROJECT);
  }
}
