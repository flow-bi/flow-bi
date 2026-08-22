package com.flowbi.domain.team.service;

import com.flowbi.domain.team.dto.TeamCreateRequest;
import com.flowbi.domain.team.dto.TeamNameUpdateRequest;
import com.flowbi.domain.team.dto.TeamNameValidator;
import com.flowbi.domain.team.dto.TeamResponse;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.entity.TeamClosure;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeamService {

  private final TeamRepository teams;
  private final TeamClosureRepository closures;

  public TeamService(TeamRepository teams, TeamClosureRepository closures) {
    this.teams = teams;
    this.closures = closures;
  }

  @Transactional
  public Team findOrCreate(String teamName) {
    String normalizedTeamName = TeamNameValidator.normalize(teamName);
    return teams.findByTeamNameIgnoreCaseAndParentTeamIsNull(normalizedTeamName)
        .orElseGet(() -> createTeam(new TeamCreateRequest(normalizedTeamName, null)));
  }

  public Team findExisting(Long teamId) {
    return teams.findById(teamId).orElseThrow(() -> new TeamNotFoundException(teamId));
  }

  public List<Team> findAll() {
    return teams.findAll();
  }

  @Transactional
  public TeamResponse create(TeamCreateRequest request) {
    return TeamResponse.from(createTeam(request));
  }

  private Team createTeam(TeamCreateRequest request) {
    Team parent = findParentForCreation(request.parentTeamId());
    assertNameAvailable(parent,request.teamName(),null);
    Team team = saveTeam(request.teamName(),parent);
    saveClosures(team,parent);
    return team;
  }

  @Transactional
  public TeamResponse updateName(Long teamId,TeamNameUpdateRequest request) {
    Team team = findExisting(teamId);
    assertNameAvailable(team.getParentTeam(),request.teamName(),teamId);
    try {
      team.changeName(request.teamName());
      teams.flush();
      return TeamResponse.from(team);
    } catch (DataIntegrityViolationException exception) {
      throw new TeamNameConflictException(request.teamName());
    }
  }

  private Team findParentForCreation(Long parentTeamId) {
    if (parentTeamId == null) {
      return null;
    }
    return teams.findByIdForUpdate(parentTeamId)
        .orElseThrow(() -> new TeamNotFoundException(parentTeamId));
  }

  private void assertNameAvailable(Team parent,String name,Long currentTeamId) {
    boolean exists = parent == null
        ? currentTeamId == null
            ? teams.existsByParentTeamIsNullAndTeamNameIgnoreCase(name)
            : teams.existsByParentTeamIsNullAndTeamNameIgnoreCaseAndTeamIdNot(name,currentTeamId)
        : currentTeamId == null
            ? teams.existsByParentTeamTeamIdAndTeamNameIgnoreCase(parent.getTeamId(),name)
            : teams.existsByParentTeamTeamIdAndTeamNameIgnoreCaseAndTeamIdNot(parent.getTeamId(),
                name,currentTeamId);
    if (exists) {
      throw new TeamNameConflictException(name);
    }
  }

  private Team saveTeam(String name,Team parent) {
    try {
      return teams.saveAndFlush(Team.create(name,parent));
    } catch (DataIntegrityViolationException exception) {
      throw new TeamNameConflictException(name);
    }
  }

  private void saveClosures(Team team,Team parent) {
    if (parent == null) {
      closures.saveAll(List.of(TeamClosure.create(team,team,0)));
      return;
    }
    List<TeamClosure> relationships = new ArrayList<>();
    relationships.add(TeamClosure.create(team,team,0));
    for (TeamClosure ancestor : closures
        .findAllByDescendantTeamTeamIdOrderByDepthAsc(parent.getTeamId())) {
      relationships
          .add(TeamClosure.create(ancestor.getAncestorTeam(),team,ancestor.getDepth() + 1));
    }
    closures.saveAll(relationships);
  }
}
