package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScheduleAttendeeCandidateTest {

  @Test
  void returnsOnlyMinimalAccessibleActiveUserFieldsWithANormalizedQueryAndLimit() {
    CapturingCandidateReader reader = new CapturingCandidateReader();
    ScheduleAttendeeCandidateService service = new ScheduleAttendeeCandidateService(
        () -> java.util.Optional.of(10L), reader);

    List<ScheduleAttendeeCandidateResponse> response = service.search("  yun\t  seo  ");

    assertThat(reader.requestingUserId).isEqualTo(10L);
    assertThat(reader.query).isEqualTo("yun seo");
    assertThat(reader.limit).isEqualTo(20);
    assertThat(response).hasSize(20);
    assertThat(response.get(0).userId()).isEqualTo(1L);
    assertThat(response.get(0).displayName()).isEqualTo("User 1");
  }

  @Test
  void rejectsUnauthenticatedAndInvalidQueriesBeforeReadingCandidates() {
    CapturingCandidateReader reader = new CapturingCandidateReader();
    ScheduleAttendeeCandidateService unauthenticated = new ScheduleAttendeeCandidateService(
        ScheduleUserProvider.unauthenticated(), reader);
    ScheduleAttendeeCandidateService authenticated = new ScheduleAttendeeCandidateService(
        () -> java.util.Optional.of(10L), reader);

    assertThatThrownBy(() -> unauthenticated.search("yun"))
        .isInstanceOf(ScheduleAuthenticationRequiredException.class);
    assertThatThrownBy(() -> authenticated.search("   "))
        .isInstanceOf(ScheduleValidationException.class);
    assertThatThrownBy(() -> authenticated.search("x".repeat(51)))
        .isInstanceOf(ScheduleValidationException.class);
    assertThat(reader.calls).isZero();
  }

  @Test
  void returnsSafeHttpResponsesForEmptyAuthenticationAndValidationResults() throws Exception {
    ScheduleAttendeeCandidateService emptyService = new ScheduleAttendeeCandidateService(
        () -> java.util.Optional.of(10L), ScheduleAttendeeCandidateReader.none());
    MockMvc emptyMvc = MockMvcBuilders
        .standaloneSetup(new ScheduleAttendeeCandidateController(emptyService)).build();

    emptyMvc.perform(get("/api/schedules/attendee-candidates").param("query","nobody"))
        .andExpect(status().isOk()).andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$").isEmpty());

    ScheduleAttendeeCandidateService populatedService = new ScheduleAttendeeCandidateService(
        () -> java.util.Optional.of(10L),
        (userId,query,limit) -> List.of(new ScheduleAttendeeCandidateResponse(20L, "Yun Seo")));
    MockMvc populatedMvc = MockMvcBuilders
        .standaloneSetup(new ScheduleAttendeeCandidateController(populatedService)).build();
    populatedMvc.perform(get("/api/schedules/attendee-candidates").param("query","yun"))
        .andExpect(status().isOk()).andExpect(jsonPath("$[0].userId").value(20))
        .andExpect(jsonPath("$[0].displayName").value("Yun Seo"))
        .andExpect(jsonPath("$[0].email").doesNotExist())
        .andExpect(jsonPath("$[0].phoneNumber").doesNotExist());

    emptyMvc.perform(get("/api/schedules/attendee-candidates").param("query"," "))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_ATTENDEE_QUERY"));

    ScheduleAttendeeCandidateService deniedService = new ScheduleAttendeeCandidateService(
        ScheduleUserProvider.unauthenticated(), ScheduleAttendeeCandidateReader.none());
    MockMvc deniedMvc = MockMvcBuilders
        .standaloneSetup(new ScheduleAttendeeCandidateController(deniedService)).build();
    deniedMvc.perform(get("/api/schedules/attendee-candidates").param("query","yun"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
  }

  private static final class CapturingCandidateReader implements ScheduleAttendeeCandidateReader {
    private Long requestingUserId;
    private String query;
    private int limit;
    private int calls;

    @Override
    public List<ScheduleAttendeeCandidateResponse> searchAccessibleActive(Long userId,
        String normalizedQuery,int maximumResults) {
      requestingUserId = userId;
      query = normalizedQuery;
      limit = maximumResults;
      calls++;
      List<ScheduleAttendeeCandidateResponse> candidates = new ArrayList<>();
      for (long id = 1; id <= 25; id++) {
        candidates.add(new ScheduleAttendeeCandidateResponse(id, "User " + id));
      }
      return candidates;
    }
  }
}
