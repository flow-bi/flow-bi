package com.flowbi.domain.team.service;

import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeamDeletionService {

  private final TeamRepository teams;
  private final TeamClosureRepository closures;

  public TeamDeletionService(TeamRepository teams, TeamClosureRepository closures) {
    this.teams = teams;
    this.closures = closures;
  }

  @Transactional
  public void delete(Long teamId) {
    Team team = teams.findByIdForUpdate(teamId)
        .orElseThrow(() -> new TeamNotFoundException(teamId));
    if (teams.existsByParentTeamTeamId(teamId)) {
      throw new TeamHasChildrenException(teamId);
    }

    closures.deleteRelationshipsForTeam(teamId);
    try {
      teams.delete(team);
      teams.flush();
    } catch (DataIntegrityViolationException exception) {
      throw new TeamInUseException(teamId);
    }
  }
}
