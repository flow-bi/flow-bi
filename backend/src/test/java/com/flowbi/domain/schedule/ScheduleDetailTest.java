package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScheduleDetailTest {

  @Test
  void returnsOnlyTheAuthorizedScheduleDetailFields() {
    Instant start = Instant.parse("2026-08-10T01:00:00Z");
    Schedule schedule = ScheduleFixtures.personalWithAttendee(1L,10L,20L,start,
        start.plusSeconds(3600));
    ScheduleQueryService service = ScheduleFixtures.serviceFor(20L,List.of(schedule));

    ScheduleDetailResponse response = service.getSchedule(1L);

    assertThat(response.scheduleId()).isEqualTo(1L);
    assertThat(response.location()).isEqualTo("Seoul");
    assertThat(response.description()).isEqualTo("Planning");
    assertThat(response.visibility()).isEqualTo(ScheduleVisibility.PRIVATE);
    assertThat(response.targets()).isEmpty();
    assertThat(response.attendees()).extracting(ScheduleAttendeeResponse::userId)
        .containsExactly(20L);
    assertThat(response.creatorAttending()).isTrue();
  }

  @Test
  void returnsAuthorizedSharedTargetsInTheScheduleDetail() {
    Instant start = Instant.parse("2026-08-10T01:00:00Z");
    Schedule schedule = ScheduleFixtures.team(1L,10L,100L,start,start.plusSeconds(3600));
    ScheduleQueryService service = ScheduleFixtures.serviceForTeamMember(20L,100L,
        List.of(schedule));

    ScheduleDetailResponse response = service.getSchedule(1L);

    assertThat(response.targets()).containsExactly(ScheduleTarget.team(100L));
  }

  @Test
  void doesNotExposeInternalDetailsForMissingOrInaccessibleSchedules() {
    ScheduleQueryService service = ScheduleFixtures.serviceFor(99L,
        List.of(ScheduleFixtures.personal(1L,10L,Instant.parse("2026-08-01T00:00:00Z"),
            Instant.parse("2026-08-01T01:00:00Z"))));

    assertThatThrownBy(() -> service.getSchedule(1L)).isInstanceOf(ScheduleNotFoundException.class)
        .hasMessage("Schedule not found");
    assertThatThrownBy(() -> service.getSchedule(2L)).isInstanceOf(ScheduleNotFoundException.class)
        .hasMessage("Schedule not found");
  }

  @Test
  void excludesSchedulesCancelledByRoomReservationFromDetailQueries() {
    Schedule cancelled = ScheduleFixtures.cancelledPersonal(1L,10L,
        Instant.parse("2026-08-01T00:00:00Z"),Instant.parse("2026-08-01T01:00:00Z"));
    ScheduleQueryService service = ScheduleFixtures.serviceFor(10L,List.of(cancelled));

    assertThatThrownBy(() -> service.getSchedule(1L)).isInstanceOf(ScheduleNotFoundException.class)
        .hasMessage("Schedule not found");
  }

  @Test
  void returnsSafeHttpErrorsForUnauthenticatedAndInvalidRequests() throws Exception {
    ScheduleQueryService service = new ScheduleQueryService(
        new InMemoryScheduleRepository(List.of()), ScheduleUserProvider.unauthenticated(),
        ScheduleMembershipReader.none());
    MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ScheduleController(service)).build();

    mockMvc
        .perform(get("/api/schedules").param("from","invalid").param("to","2026-08-01T01:00:00Z"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    mockMvc.perform(get("/api/schedules/1")).andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
  }

  @Test
  void returnsASafeErrorForAMalformedScheduleId() throws Exception {
    ScheduleQueryService service = new ScheduleQueryService(
        new InMemoryScheduleRepository(List.of()), ScheduleUserProvider.unauthenticated(),
        ScheduleMembershipReader.none());
    MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ScheduleController(service)).build();

    mockMvc.perform(get("/api/schedules/not-a-number")).andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_SCHEDULE_ID"));
  }
}
