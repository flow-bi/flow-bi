package com.flowbi.domain.team.service;

import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.repository.TeamRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TeamService {

  private final TeamRepository teams;

  public TeamService(TeamRepository teams) {
    this.teams = teams;
  }

  public Team findOrCreate(String teamName) {
    return teams.findByTeamName(teamName).orElseGet(() -> teams.save(Team.create(teamName)));
  }

  public Team findExisting(Long teamId) {
    return teams.findById(teamId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
  }

  public List<Team> findAll() {
    return teams.findAll();
  }
}
