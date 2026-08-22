package com.flowbi.domain.team.dto;

import com.flowbi.domain.team.entity.Team;

public record TeamResponse(Long teamId, String teamName, Long parentTeamId) {
  public static TeamResponse from(Team team) {
    return new TeamResponse(team.getTeamId(), team.getTeamName(),
        team.getParentTeam() == null ? null : team.getParentTeam().getTeamId());
  }
}
