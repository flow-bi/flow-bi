package com.flowbi.domain.team.dto;

public record TeamNameUpdateRequest(String teamName) {
  public TeamNameUpdateRequest {
    teamName = TeamNameValidator.normalize(teamName);
  }
}
