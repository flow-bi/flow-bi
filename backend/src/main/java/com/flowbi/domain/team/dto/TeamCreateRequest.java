package com.flowbi.domain.team.dto;

public record TeamCreateRequest(String teamName, Long parentTeamId) {
  public TeamCreateRequest {
    teamName = TeamNameValidator.normalize(teamName);
    if (parentTeamId != null && parentTeamId <= 0) {
      throw new IllegalArgumentException("parentTeamId must be positive");
    }
  }
}
