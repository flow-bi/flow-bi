package com.flowbi.domain.team.service;

import com.flowbi.domain.auth.dto.AuthenticatedUser;
import com.flowbi.domain.auth.dto.AuthenticatedUser.Role;
import com.flowbi.domain.team.dto.TeamCreateRequest;
import com.flowbi.domain.team.dto.TeamMoveRequest;
import com.flowbi.domain.team.dto.TeamNameUpdateRequest;
import com.flowbi.domain.team.dto.TeamResponse;
import org.springframework.stereotype.Service;

@Service
public class TeamAdministrationService {

  private final TeamService teams;
  private final TeamHierarchyMoveService moves;
  private final TeamDeletionService deletions;

  public TeamAdministrationService(TeamService teams, TeamHierarchyMoveService moves,
      TeamDeletionService deletions) {
    this.teams = teams;
    this.moves = moves;
    this.deletions = deletions;
  }

  public TeamResponse create(AuthenticatedUser actor,TeamCreateRequest request) {
    requireAdmin(actor);
    return teams.create(request);
  }

  public TeamResponse rename(AuthenticatedUser actor,Long teamId,TeamNameUpdateRequest request) {
    requireAdmin(actor);
    return teams.updateName(teamId,request);
  }

  public TeamResponse move(AuthenticatedUser actor,Long teamId,TeamMoveRequest request) {
    requireAdmin(actor);
    return moves.move(teamId,request);
  }

  public void delete(AuthenticatedUser actor,Long teamId) {
    requireAdmin(actor);
    deletions.delete(teamId);
  }

  private void requireAdmin(AuthenticatedUser actor) {
    if (actor == null || actor.role() != Role.ADMIN) {
      throw new TeamAdminRequiredException();
    }
  }
}
