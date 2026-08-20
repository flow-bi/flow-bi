package com.flowbi.domain.team.service;

import com.flowbi.domain.team.dto.TeamMoveRequest;
import com.flowbi.domain.team.dto.TeamResponse;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeamHierarchyMoveService {

  private final TeamRepository teams;
  private final TeamClosureRepository closures;
  private final TeamHierarchyService hierarchyService;

  public TeamHierarchyMoveService(TeamRepository teams, TeamClosureRepository closures,
      TeamHierarchyService hierarchyService) {
    this.teams = teams;
    this.closures = closures;
    this.hierarchyService = hierarchyService;
  }

  @Transactional
  public TeamResponse move(Long teamId,TeamMoveRequest request) {
    Long newParentTeamId = request.newParentTeamId();
    List<Long> initialSubtreeIds = requireSubtree(teamId);
    Map<Long, Team> lockedTeams = lockInDeterministicOrder(initialSubtreeIds,newParentTeamId);
    Team movingRoot = requireLockedTeam(lockedTeams,teamId);
    Team newParent = newParentTeamId == null
        ? null
        : requireLockedTeam(lockedTeams,newParentTeamId);
    List<Long> currentSubtreeIds = requireSubtree(teamId);
    assertLockedSubtree(currentSubtreeIds,lockedTeams,teamId,newParentTeamId);
    assertBasicMoveAllowed(movingRoot,newParentTeamId);
    List<Long> newParentAncestorIds = newParent == null
        ? List.of()
        : requireAncestorRelationships(newParent.getTeamId());
    assertNoDescendantMove(movingRoot,newParentTeamId,newParentAncestorIds);

    closures.deleteExternalAncestorRelationships(teamId);
    movingRoot.changeParentTeam(newParent);
    teams.flush();
    if (newParent != null) {
      closures.insertExternalAncestorRelationships(teamId,newParent.getTeamId());
    }
    hierarchyService.findOrganizationTree();
    return TeamResponse.from(movingRoot);
  }

  private List<Long> requireSubtree(Long teamId) {
    List<Long> subtreeIds = closures.findDescendantTeamIds(teamId);
    if (subtreeIds.isEmpty() || !subtreeIds.contains(teamId)) {
      throw new TeamNotFoundException(teamId);
    }
    return subtreeIds;
  }

  private Map<Long, Team> lockInDeterministicOrder(List<Long> subtreeIds,Long newParentTeamId) {
    List<Long> idsToLock = new ArrayList<>(subtreeIds);
    if (newParentTeamId != null && !idsToLock.contains(newParentTeamId)) {
      idsToLock.add(newParentTeamId);
    }
    idsToLock.sort(Comparator.naturalOrder());
    Map<Long, Team> result = new HashMap<>();
    for (Team team : teams.findAllByTeamIdInForUpdateOrderByTeamIdAsc(idsToLock)) {
      result.put(team.getTeamId(),team);
    }
    return result;
  }

  private List<Long> requireAncestorRelationships(Long teamId) {
    List<Long> ancestorIds = closures.findAncestorTeamIds(teamId);
    if (ancestorIds.isEmpty() || !ancestorIds.contains(teamId)) {
      throw new TeamHierarchyInconsistentException();
    }
    return ancestorIds;
  }

  private Team requireLockedTeam(Map<Long, Team> lockedTeams,Long teamId) {
    Team team = lockedTeams.get(teamId);
    if (team == null) {
      throw new TeamNotFoundException(teamId);
    }
    return team;
  }

  private void assertLockedSubtree(List<Long> subtreeIds,Map<Long, Team> lockedTeams,Long teamId,
      Long newParentTeamId) {
    if (!lockedTeams.keySet().containsAll(subtreeIds)) {
      throw new TeamHierarchyMoveConflictException(teamId, newParentTeamId);
    }
  }

  private void assertBasicMoveAllowed(Team movingRoot,Long newParentTeamId) {
    if (newParentTeamId == null) {
      if (movingRoot.getParentTeam() == null) {
        throw new TeamHierarchyMoveConflictException(movingRoot.getTeamId(), null);
      }
      return;
    }
    if (movingRoot.getTeamId().equals(newParentTeamId) || movingRoot.getParentTeam() != null
        && movingRoot.getParentTeam().getTeamId().equals(newParentTeamId)) {
      throw new TeamHierarchyMoveConflictException(movingRoot.getTeamId(), newParentTeamId);
    }
  }

  private void assertNoDescendantMove(Team movingRoot,Long newParentTeamId,
      List<Long> newParentAncestorIds) {
    if (newParentAncestorIds.contains(movingRoot.getTeamId())) {
      throw new TeamHierarchyMoveConflictException(movingRoot.getTeamId(), newParentTeamId);
    }
  }
}
