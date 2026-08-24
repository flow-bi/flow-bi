package com.flowbi.domain.schedule.service;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.flowbi.domain.schedule.port.ScheduleAudienceLookup;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ScheduleDetailServiceTest {

  @Test
  void returnsNamedParticipantsForRoomManagedSchedules() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleAudienceLookup audienceLookup = mock(ScheduleAudienceLookup.class);
    ScheduleRoomReservationLookup roomReservationLookup = mock(ScheduleRoomReservationLookup.class);
    ScheduleIdentityService identityService = mock(ScheduleIdentityService.class);
    ScheduleDetailService service = new ScheduleDetailService(repository, audienceLookup,
        roomReservationLookup, identityService);
    Schedule schedule = Schedule
        .create(ScheduleCreateCommand.of(1L,"Private review",ScheduleType.PERSONAL,
            ScheduleVisibility.PRIVATE,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
            OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,
            "confidential","Room A",true,List.of(7L),List.of(8L),List.of(),List.of()));
    when(repository.findActiveByIdWithAssociations(100L)).thenReturn(Optional.of(schedule));
    when(roomReservationLookup.isManagedSchedule(100L)).thenReturn(true);
    when(identityService.findUserDisplayNames(List.of(7L)))
        .thenReturn(List.of(new AttendeeCandidate(7L, "Attendee")));

    ScheduleDetailResponse result = service.find(7L,100L);

    assertThat(result.content()).isEqualTo("confidential");
    assertThat(result.location()).isEqualTo("Room A");
    assertThat(result.participantIds()).containsExactly(7L);
    assertThat(result.participants()).containsExactly(new AttendeeCandidate(7L, "Attendee"));
    assertThat(result.attendeeCount()).isEqualTo(2);
    assertThat(result.userTargetIds()).containsExactly(8L);
    assertThat(result.teamTargetIds()).isEmpty();
    assertThat(result.projectTargetIds()).isEmpty();
    assertThat(result.meetingRoomManaged()).isTrue();
    assertThat(result.canManage()).isFalse();
  }

  @Test
  void letsOnlyTheCreatorManageARegularSchedule() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleAudienceLookup audienceLookup = mock(ScheduleAudienceLookup.class);
    ScheduleRoomReservationLookup roomReservationLookup = mock(ScheduleRoomReservationLookup.class);
    ScheduleIdentityService identityService = mock(ScheduleIdentityService.class);
    ScheduleDetailService service = new ScheduleDetailService(repository, audienceLookup,
        roomReservationLookup, identityService);
    Schedule schedule = Schedule
        .create(ScheduleCreateCommand.of(1L,"Creator schedule",ScheduleType.PERSONAL,
            ScheduleVisibility.PRIVATE,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
            OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,null,
            null,false,List.of(),List.of(),List.of(),List.of()));
    when(repository.findActiveByIdWithAssociations(100L)).thenReturn(Optional.of(schedule));
    when(identityService.findUserDisplayNames(List.of())).thenReturn(List.of());

    ScheduleDetailResponse result = service.find(1L,100L);

    assertThat(result.canManage()).isTrue();
    assertThat(result.meetingRoomManaged()).isFalse();
  }

  @Test
  void marksRoomManagedSchedulesAsNotManageableInCalendar() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleAudienceLookup audienceLookup = mock(ScheduleAudienceLookup.class);
    ScheduleRoomReservationLookup roomReservationLookup = mock(ScheduleRoomReservationLookup.class);
    ScheduleIdentityService identityService = mock(ScheduleIdentityService.class);
    ScheduleDetailService service = new ScheduleDetailService(repository, audienceLookup,
        roomReservationLookup, identityService);
    Schedule schedule = Schedule
        .create(ScheduleCreateCommand.of(1L,"Room schedule",ScheduleType.PERSONAL,
            ScheduleVisibility.PRIVATE,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
            OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,null,
            null,false,List.of(),List.of(),List.of(),List.of()));
    when(repository.findActiveByIdWithAssociations(100L)).thenReturn(Optional.of(schedule));
    when(roomReservationLookup.isManagedSchedule(100L)).thenReturn(true);
    when(identityService.findUserDisplayNames(List.of())).thenReturn(List.of());

    ScheduleDetailResponse result = service.find(1L,100L);

    assertThat(result.meetingRoomManaged()).isTrue();
    assertThat(result.canManage()).isFalse();
  }

  @Test
  void doesNotCountTheCreatorTwiceWhenTheCreatorIsAlsoAParticipant() {
    Schedule schedule = Schedule.create(ScheduleCreateCommand.of(1L,"Team",ScheduleType.TEAM,
        ScheduleVisibility.TEAM,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,null,null,
        true,List.of(1L),List.of(),List.of(10L),List.of()));

    assertThat(schedule.attendeeCount()).isEqualTo(1);
  }

  @Test
  void exposesAnActiveReservationCancellationReferenceOnlyToItsOwner() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleAudienceLookup audienceLookup = mock(ScheduleAudienceLookup.class);
    ScheduleRoomReservationLookup roomReservationLookup = mock(ScheduleRoomReservationLookup.class);
    ScheduleIdentityService identityService = mock(ScheduleIdentityService.class);
    ScheduleDetailService service = new ScheduleDetailService(repository, audienceLookup,
        roomReservationLookup, identityService);
    Schedule schedule = Schedule
        .create(ScheduleCreateCommand.of(1L,"Room schedule",ScheduleType.PERSONAL,
            ScheduleVisibility.PRIVATE,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
            OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,null,
            null,false,List.of(2L),List.of(),List.of(),List.of()));
    when(repository.findActiveByIdWithAssociations(100L)).thenReturn(Optional.of(schedule));
    when(roomReservationLookup.isManagedSchedule(100L)).thenReturn(true);
    when(roomReservationLookup.findActiveReservationIdOwnedBy(100L,1L))
        .thenReturn(Optional.of(77L));
    when(identityService.findUserDisplayNames(List.of(2L))).thenReturn(List.of());

    ScheduleDetailResponse ownerResult = service.find(1L,100L);
    ScheduleDetailResponse otherResult = service.find(2L,100L);

    assertThat(ownerResult.roomReservationId()).isEqualTo(77L);
    assertThat(ownerResult.canCancelRoomReservation()).isTrue();
    assertThat(otherResult.roomReservationId()).isNull();
    assertThat(otherResult.canCancelRoomReservation()).isFalse();
  }

  @Test
  void returnsTheSameSafeNotFoundForMissingAndHiddenSchedules() {
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleAudienceLookup audienceLookup = mock(ScheduleAudienceLookup.class);
    ScheduleRoomReservationLookup roomReservationLookup = mock(ScheduleRoomReservationLookup.class);
    ScheduleIdentityService identityService = mock(ScheduleIdentityService.class);
    ScheduleDetailService service = new ScheduleDetailService(repository, audienceLookup,
        roomReservationLookup, identityService);
    Schedule hidden = Schedule.create(ScheduleCreateCommand.of(1L,"Hidden",ScheduleType.TEAM,
        ScheduleVisibility.TEAM,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,null,null,
        false,List.of(),List.of(),List.of(10L),List.of()));
    when(repository.findActiveByIdWithAssociations(100L)).thenReturn(Optional.of(hidden));
    when(repository.findActiveByIdWithAssociations(101L)).thenReturn(Optional.empty());
    when(audienceLookup.memberTeamIds(7L,Set.of(10L))).thenReturn(Set.of());
    when(audienceLookup.memberProjectIds(7L,Set.of())).thenReturn(Set.of());

    assertThatThrownBy(() -> service.find(7L,100L)).isInstanceOf(ScheduleNotFoundException.class)
        .hasMessage("Schedule not found");
    assertThatThrownBy(() -> service.find(7L,101L)).isInstanceOf(ScheduleNotFoundException.class)
        .hasMessage("Schedule not found");
  }
}
