package com.flowbi.domain.team.service;

import com.flowbi.domain.team.dto.TeamHierarchyResponse;
import com.flowbi.domain.team.dto.TeamPathResponse;
import com.flowbi.domain.team.dto.TeamRelationResponse;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamHierarchyClosureRow;
import com.flowbi.domain.team.repository.TeamHierarchyTeamRow;
import com.flowbi.domain.team.repository.TeamRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeamHierarchyService {

  private static final Comparator<TeamHierarchyTeamRow> TEAM_ORDER = Comparator
      .comparing(TeamHierarchyTeamRow::teamName).thenComparing(TeamHierarchyTeamRow::teamId);

  private final TeamRepository teams;
  private final TeamClosureRepository closures;

  public TeamHierarchyService(TeamRepository teams, TeamClosureRepository closures) {
    this.teams = teams;
    this.closures = closures;
  }

  @Transactional(readOnly = true)
  public Optional<TeamRelationResponse> findParent(Long teamId) {
    Snapshot snapshot = snapshot();
    TeamHierarchyTeamRow team = snapshot.requireTeam(teamId);
    return team.parentTeamId() == null
        ? Optional.empty()
        : Optional.of(relation(snapshot.requireTeam(team.parentTeamId()),1));
  }

  @Transactional(readOnly = true)
  public List<TeamRelationResponse> findChildren(Long teamId) {
    Snapshot snapshot = snapshot();
    snapshot.requireTeam(teamId);
    return snapshot.teams().stream().filter(team -> teamId.equals(team.parentTeamId()))
        .sorted(TEAM_ORDER).map(team -> relation(team,1)).toList();
  }

  @Transactional(readOnly = true)
  public List<TeamRelationResponse> findAncestors(Long teamId) {
    Snapshot snapshot = snapshot();
    snapshot.requireTeam(teamId);
    return relations(snapshot.rowsWithDescendant(teamId),true,snapshot);
  }

  @Transactional(readOnly = true)
  public List<TeamRelationResponse> findDescendants(Long teamId) {
    Snapshot snapshot = snapshot();
    snapshot.requireTeam(teamId);
    return relations(snapshot.rowsWithAncestor(teamId),false,snapshot);
  }

  @Transactional(readOnly = true)
  public List<TeamPathResponse> findPath(Long teamId) {
    Snapshot snapshot = snapshot();
    snapshot.requireTeam(teamId);
    List<TeamHierarchyClosureRow> path = snapshot.rowsWithDescendant(teamId).stream()
        .sorted(Comparator.comparingInt(TeamHierarchyClosureRow::depth).reversed()).toList();
    List<TeamPathResponse> result = new ArrayList<>();
    for (int index = 0; index < path.size(); index++) {
      TeamHierarchyTeamRow team = snapshot.requireTeam(path.get(index).ancestorTeamId());
      result.add(new TeamPathResponse(team.teamId(), team.teamName(), index));
    }
    return List.copyOf(result);
  }

  @Transactional(readOnly = true)
  public TeamHierarchyResponse findSubtree(Long teamId) {
    Snapshot snapshot = snapshot();
    snapshot.requireTeam(teamId);
    return assembleTree(snapshot,teamId);
  }

  @Transactional(readOnly = true)
  public List<TeamHierarchyResponse> findOrganizationTree() {
    Snapshot snapshot = snapshot();
    return snapshot.teams().stream().filter(team -> team.parentTeamId() == null).sorted(TEAM_ORDER)
        .map(team -> assembleTree(snapshot,team.teamId())).toList();
  }

  private List<TeamRelationResponse> relations(List<TeamHierarchyClosureRow> rows,boolean ancestors,
      Snapshot snapshot) {
    return rows.stream().filter(row -> row.depth() > 0)
        .sorted(Comparator.comparingInt(TeamHierarchyClosureRow::depth)
            .thenComparing(row -> ancestors
                ? snapshot.requireTeam(row.ancestorTeamId())
                : snapshot.requireTeam(row.descendantTeamId()),TEAM_ORDER))
        .map(row -> ancestors
            ? relation(snapshot.requireTeam(row.ancestorTeamId()),row.depth())
            : relation(snapshot.requireTeam(row.descendantTeamId()),row.depth()))
        .toList();
  }

  private Snapshot snapshot() {
    return new Snapshot(teams.findAllHierarchyRows(), closures.findAllHierarchyRows());
  }

  private TeamHierarchyResponse assembleTree(Snapshot snapshot,Long rootId) {
    Set<Long> subtreeIds = snapshot.rowsWithAncestor(rootId).stream()
        .map(TeamHierarchyClosureRow::descendantTeamId)
        .collect(java.util.stream.Collectors.toSet());
    return assembleNode(snapshot,rootId,0,subtreeIds);
  }

  private TeamHierarchyResponse assembleNode(Snapshot snapshot,Long teamId,int depth,
      Set<Long> subtreeIds) {
    TeamHierarchyTeamRow team = snapshot.requireTeam(teamId);
    List<TeamHierarchyResponse> children = snapshot.teams().stream()
        .filter(candidate -> teamId.equals(candidate.parentTeamId()))
        .filter(candidate -> subtreeIds.contains(candidate.teamId())).sorted(TEAM_ORDER)
        .map(candidate -> assembleNode(snapshot,candidate.teamId(),depth + 1,subtreeIds)).toList();
    return new TeamHierarchyResponse(team.teamId(), team.teamName(), depth, children);
  }

  private TeamRelationResponse relation(TeamHierarchyTeamRow team,int distance) {
    return new TeamRelationResponse(team.teamId(), team.teamName(), distance);
  }

  private static final class Snapshot {

    private final Map<Long, TeamHierarchyTeamRow> teamsById;
    private final List<TeamHierarchyClosureRow> rows;

    private Snapshot(List<TeamHierarchyTeamRow> teams, List<TeamHierarchyClosureRow> rows) {
      this.teamsById = indexTeams(teams);
      this.rows = List.copyOf(rows);
      validate();
    }

    private List<TeamHierarchyTeamRow> teams() {
      return List.copyOf(teamsById.values());
    }

    private TeamHierarchyTeamRow requireTeam(Long teamId) {
      TeamHierarchyTeamRow team = teamsById.get(teamId);
      if (team == null) {
        throw new TeamNotFoundException(teamId);
      }
      return team;
    }

    private List<TeamHierarchyClosureRow> rowsWithAncestor(Long teamId) {
      return rows.stream().filter(row -> teamId.equals(row.ancestorTeamId())).toList();
    }

    private List<TeamHierarchyClosureRow> rowsWithDescendant(Long teamId) {
      return rows.stream().filter(row -> teamId.equals(row.descendantTeamId())).toList();
    }

    private static Map<Long, TeamHierarchyTeamRow> indexTeams(List<TeamHierarchyTeamRow> teams) {
      Map<Long, TeamHierarchyTeamRow> result = new HashMap<>();
      for (TeamHierarchyTeamRow team : teams) {
        if (team == null || team.teamId() == null || result.put(team.teamId(),team) != null) {
          throw new TeamHierarchyInconsistentException();
        }
      }
      return Map.copyOf(result);
    }

    private void validate() {
      Set<String> relationships = new HashSet<>();
      for (TeamHierarchyClosureRow row : rows) {
        if (row == null || !teamsById.containsKey(row.ancestorTeamId())
            || !teamsById.containsKey(row.descendantTeamId()) || row.depth() < 0
            || !relationships.add(row.ancestorTeamId() + ":" + row.descendantTeamId())) {
          throw new TeamHierarchyInconsistentException();
        }
      }
      int expectedRows = 0;
      for (TeamHierarchyTeamRow team : teams()) {
        expectedRows += validatePath(team);
      }
      if (expectedRows != rows.size()) {
        throw new TeamHierarchyInconsistentException();
      }
    }

    private int validatePath(TeamHierarchyTeamRow team) {
      Long ancestorId = team.teamId();
      int expectedDepth = 0;
      Set<Long> visited = new HashSet<>();
      while (ancestorId != null && visited.add(ancestorId)) {
        TeamHierarchyClosureRow row = rowsWithAncestor(ancestorId).stream()
            .filter(candidate -> team.teamId().equals(candidate.descendantTeamId())).findFirst()
            .orElseThrow(TeamHierarchyInconsistentException::new);
        if (row.depth() != expectedDepth) {
          throw new TeamHierarchyInconsistentException();
        }
        ancestorId = requireTeam(ancestorId).parentTeamId();
        expectedDepth++;
      }
      if (ancestorId != null) {
        throw new TeamHierarchyInconsistentException();
      }
      return expectedDepth;
    }
  }
}
