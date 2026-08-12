package com.flowbi.domain.team.service;

import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.repository.TeamRepository;
import org.springframework.stereotype.Service;

@Service
public class TeamService {

  private final TeamRepository teams;

  public TeamService(TeamRepository teams) {
    this.teams = teams;
  }

  public Team findOrCreate(String teamName) {
    return teams.findByTeamName(teamName).orElseGet(() -> teams.save(Team.create(teamName)));
  }
}
