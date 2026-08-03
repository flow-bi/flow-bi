package com.flowbi.domain.schedule;

import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class ScheduleAttendeeCandidateService {

  static final int MAXIMUM_RESULTS = 20;
  private static final Pattern WHITESPACE = Pattern.compile("[\\s\\p{Zs}]+");

  private final ScheduleUserProvider userProvider;
  private final ScheduleAttendeeCandidateReader candidateReader;

  public ScheduleAttendeeCandidateService(ScheduleUserProvider userProvider,
      ScheduleAttendeeCandidateReader candidateReader) {
    this.userProvider = userProvider;
    this.candidateReader = candidateReader;
  }

  public List<ScheduleAttendeeCandidateResponse> search(String query) {
    Long requestingUserId = userProvider.currentUserId()
        .orElseThrow(ScheduleAuthenticationRequiredException::new);
    String normalizedQuery = normalize(query);
    return candidateReader.searchAccessibleActive(requestingUserId,normalizedQuery,MAXIMUM_RESULTS)
        .stream().limit(MAXIMUM_RESULTS).toList();
  }

  private String normalize(String query) {
    if (query == null) {
      throw new ScheduleValidationException();
    }
    String normalized = WHITESPACE.matcher(query.strip()).replaceAll(" ");
    if (normalized.isEmpty() || normalized.length() > 50) {
      throw new ScheduleValidationException();
    }
    return normalized;
  }
}
