package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScheduleValidationTest {

  @Test
  void rejectsInvalidTimesVisibilityTargetsAndInaccessibleAttendees() {
    ScheduleCreateService service = new ScheduleCreateService(
        new InMemoryScheduleRepository(List.of()), () -> Optional.of(10L),
        new CreationMembershipReader(Set.of(100L), Set.of(200L)), userId -> userId.equals(20L),
        ScheduleCreationAuditLogger.noop());
    Instant start = Instant.parse("2026-08-10T10:00:00Z");

    assertThatThrownBy(() -> service.create(
        new ScheduleCreateRequest("Planning", ScheduleType.PERSONAL, null, ScheduleColorLabel.BLUE,
            false, start, start, "Seoul", "Details", List.of(), List.of(), false)))
        .isInstanceOf(ScheduleValidationException.class);
    assertThatThrownBy(() -> service.create(new ScheduleCreateRequest("Planning", ScheduleType.TEAM,
        ScheduleVisibility.PRIVATE, ScheduleColorLabel.BLUE, false, start, start.plusSeconds(60),
        "Seoul", "Details", List.of(ScheduleTarget.team(100L)), List.of(), false)))
        .isInstanceOf(ScheduleValidationException.class);
    assertThatThrownBy(() -> service.create(new ScheduleCreateRequest("Planning", ScheduleType.TEAM,
        null, ScheduleColorLabel.BLUE, false, start, start.plusSeconds(60), "Seoul", "Details",
        List.of(ScheduleTarget.project(200L)), List.of(), false)))
        .isInstanceOf(ScheduleValidationException.class);
    assertThatThrownBy(() -> service.create(new ScheduleCreateRequest("Planning",
        ScheduleType.PROJECT, null, ScheduleColorLabel.BLUE, false, start, start.plusSeconds(60),
        "Seoul", "Details", List.of(ScheduleTarget.project(201L)), List.of(), false)))
        .isInstanceOf(ScheduleValidationException.class);
    assertThatThrownBy(() -> service.create(new ScheduleCreateRequest("Planning",
        ScheduleType.PERSONAL, null, ScheduleColorLabel.BLUE, false, start, start.plusSeconds(60),
        "Seoul", "Details", List.of(), List.of(21L), false)))
        .isInstanceOf(ScheduleValidationException.class);
  }

  @Test
  void rejectsBlankRequiredValuesAndNormalizesDuplicateAttendees() {
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(List.of());
    ScheduleCreateService service = new ScheduleCreateService(repository, () -> Optional.of(10L),
        new CreationMembershipReader(Set.of(), Set.of()), userId -> userId.equals(20L),
        ScheduleCreationAuditLogger.noop());
    Instant start = Instant.parse("2026-08-10T10:00:00Z");

    assertThatThrownBy(() -> service
        .create(new ScheduleCreateRequest(" ", ScheduleType.PERSONAL, null, ScheduleColorLabel.BLUE,
            false, start, start.plusSeconds(60), "Seoul", "Details", List.of(), List.of(), false)))
        .isInstanceOf(ScheduleValidationException.class);
    assertThatThrownBy(() -> service.create(
        new ScheduleCreateRequest("Planning", ScheduleType.PERSONAL, null, ScheduleColorLabel.BLUE,
            false, start, start.plusSeconds(60), " ", "Details", List.of(), List.of(), false)))
        .isInstanceOf(ScheduleValidationException.class);
    assertThatThrownBy(() -> service.create(
        new ScheduleCreateRequest("Planning", ScheduleType.PERSONAL, null, ScheduleColorLabel.BLUE,
            false, start, start.plusSeconds(60), "Seoul", " ", List.of(), List.of(), false)))
        .isInstanceOf(ScheduleValidationException.class);
    service.create(new ScheduleCreateRequest("Planning", ScheduleType.PERSONAL, null,
        ScheduleColorLabel.BLUE, false, start, start.plusSeconds(60), "Seoul", "Details", List.of(),
        List.of(20L,20L), false));
    assertThat(repository.findById(1L).orElseThrow().getAttendees()).hasSize(1);
  }

  @Test
  void rejectsNullTargetsAsInvalidInputRatherThanLeakingAnInternalError() {
    ScheduleCreateService service = new ScheduleCreateService(
        new InMemoryScheduleRepository(List.of()), () -> Optional.of(10L),
        ScheduleMembershipReader.none(), ScheduleActiveUserReader.none(),
        ScheduleCreationAuditLogger.noop());

    assertThatThrownBy(() -> service.create(
        new ScheduleCreateRequest("Planning", ScheduleType.PERSONAL, null, ScheduleColorLabel.BLUE,
            false, Instant.parse("2026-08-10T10:00:00Z"), Instant.parse("2026-08-10T11:00:00Z"),
            "Seoul", "Details", java.util.Arrays.asList((ScheduleTarget) null), List.of(), false)))
        .isInstanceOf(ScheduleValidationException.class);
  }

  @Test
  void returnsSafeApiErrorsForInvalidAndUnauthenticatedCreateRequests() throws Exception {
    ScheduleQueryService queryService = new ScheduleQueryService(
        new InMemoryScheduleRepository(List.of()), ScheduleUserProvider.unauthenticated(),
        ScheduleMembershipReader.none());
    ScheduleCreateService unauthenticatedService = new ScheduleCreateService(
        new InMemoryScheduleRepository(List.of()), ScheduleUserProvider.unauthenticated(),
        ScheduleMembershipReader.none(), ScheduleActiveUserReader.none(),
        ScheduleCreationAuditLogger.noop());
    MockMvc unauthenticatedApi = MockMvcBuilders
        .standaloneSetup(new ScheduleController(queryService, unauthenticatedService)).build();

    unauthenticatedApi
        .perform(post("/api/schedules").contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Planning\",\"type\":\"PERSONAL\",\"colorLabel\":\"BLUE\","
                + "\"startAt\":\"2026-08-10T09:00:00Z\",\"endAt\":\"2026-08-10T10:00:00Z\","
                + "\"targets\":[],\"attendeeIds\":[]}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

    ScheduleCreateService authenticatedService = new ScheduleCreateService(
        new InMemoryScheduleRepository(List.of()), () -> Optional.of(10L),
        ScheduleMembershipReader.none(), ScheduleActiveUserReader.none(),
        ScheduleCreationAuditLogger.noop());
    MockMvc validatedApi = MockMvcBuilders
        .standaloneSetup(new ScheduleController(queryService, authenticatedService)).build();
    validatedApi
        .perform(post("/api/schedules").contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"\",\"type\":\"PERSONAL\",\"colorLabel\":\"BLUE\","
                + "\"startAt\":\"2026-08-10T09:00:00Z\",\"endAt\":\"2026-08-10T10:00:00Z\","
                + "\"targets\":[],\"attendeeIds\":[]}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_SCHEDULE_REQUEST"));
  }

  @Test
  void returnsTheSameSafeValidationErrorForAnUnknownEnumValue() throws Exception {
    ScheduleQueryService queryService = new ScheduleQueryService(
        new InMemoryScheduleRepository(List.of()), () -> Optional.of(10L),
        ScheduleMembershipReader.none());
    ScheduleCreateService service = new ScheduleCreateService(
        new InMemoryScheduleRepository(List.of()), () -> Optional.of(10L),
        ScheduleMembershipReader.none(), ScheduleActiveUserReader.none(),
        ScheduleCreationAuditLogger.noop());
    MockMvc api = MockMvcBuilders.standaloneSetup(new ScheduleController(queryService, service))
        .build();

    api.perform(post("/api/schedules").contentType(MediaType.APPLICATION_JSON)
        .content("{\"title\":\"Planning\",\"type\":\"PERSONAL\","
            + "\"colorLabel\":\"MAGENTA\",\"startAt\":\"2026-08-10T09:00:00Z\","
            + "\"endAt\":\"2026-08-10T10:00:00Z\",\"location\":\"Seoul\","
            + "\"description\":\"Details\",\"targets\":[],\"attendeeIds\":[]}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_SCHEDULE_REQUEST"));
  }
}
