package com.flowbi.domain.schedule.repository;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.service.*;

import com.flowbi.domain.schedule.port.InvalidScheduleReferenceException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;

public class JdbcScheduleIdentityAdapter {

  private final JdbcTemplate jdbcTemplate;

  public JdbcScheduleIdentityAdapter(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public void requireActiveActor(long actorId) {
    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM users WHERE user_id = ? AND status = 'ACTIVE'",Integer.class,actorId);
    if (count == null || count != 1) {
      throw new ScheduleActorInactiveException();
    }
  }

  public List<AttendeeCandidate> searchActiveUsers(String rawQuery,long actorId) {
    String query = normalizeQuery(rawQuery);
    return jdbcTemplate.query("""
        SELECT user_id, name
        FROM users
        WHERE status = 'ACTIVE' AND user_id <> ?
            AND (LOWER(name) LIKE ? OR LOWER(employee_number) LIKE ?)
        ORDER BY name ASC, user_id ASC
        LIMIT 20
        """,
        (resultSet,rowNumber) -> new AttendeeCandidate(resultSet.getLong("user_id"),
            resultSet.getString("name")),
        actorId,"%" + query.toLowerCase() + "%","%" + query.toLowerCase() + "%");
  }

  public List<AttendeeCandidate> findUserDisplayNames(List<Long> userIds) {
    if (userIds.isEmpty()) {
      return List.of();
    }
    String placeholders = userIds.stream().map(userId -> "?").collect(Collectors.joining(","));
    Map<Long, String> displayNames = jdbcTemplate
        .query("""
            SELECT user_id, name
            FROM users
            WHERE user_id IN (""" + placeholders + ")",
            (resultSet,rowNumber) -> new AttendeeCandidate(resultSet.getLong("user_id"),
                resultSet.getString("name")),
            userIds.toArray())
        .stream()
        .collect(Collectors.toMap(AttendeeCandidate::userId,AttendeeCandidate::displayName));
    return userIds.stream().filter(displayNames::containsKey)
        .map(userId -> new AttendeeCandidate(userId, displayNames.get(userId))).toList();
  }

  public ScheduleTargetOptions findTargetOptions(long actorId) {
    requireActiveActor(actorId);
    return new ScheduleTargetOptions(findTeamsForActor(actorId),
        findActiveProjectsForActor(actorId));
  }

  void validateForCreation(ScheduleCreateCommand command) {
    requireActiveActor(command.creatorId());
    requireAllActiveUsers(union(command.participantIds(),command.userTargetIds()));
    requireAccessibleTeams(command.creatorId(),command.teamTargetIds());
    requireAccessibleProjects(command.creatorId(),command.projectTargetIds());
  }

  Set<Long> memberTeamIds(long actorId,Set<Long> teamIds) {
    requireActiveActor(actorId);
    if (teamIds.isEmpty()) {
      return Set.of();
    }
    Long actorTeam = jdbcTemplate.queryForObject(
        "SELECT team_id FROM users WHERE user_id = ? AND status = 'ACTIVE'",Long.class,actorId);
    return actorTeam != null && teamIds.contains(actorTeam) ? Set.of(actorTeam) : Set.of();
  }

  Set<Long> memberProjectIds(long actorId,Set<Long> projectIds) {
    requireActiveActor(actorId);
    return matchingIds("""
        SELECT pm.project_id
        FROM projects_members pm
        JOIN projects p ON p.project_id = pm.project_id
        WHERE pm.user_id = ? AND p.status = 'ACTIVE'
        """,actorId,projectIds);
  }

  private List<ScheduleTargetOption> findTeamsForActor(long actorId) {
    return jdbcTemplate.query("""
        SELECT t.team_id, t.team_name
        FROM users u
        JOIN teams t ON t.team_id = u.team_id
        WHERE u.user_id = ? AND u.status = 'ACTIVE'
        ORDER BY t.team_name ASC, t.team_id ASC
        """,targetOptionRowMapper(),actorId);
  }

  private List<ScheduleTargetOption> findActiveProjectsForActor(long actorId) {
    return jdbcTemplate.query("""
        SELECT p.project_id, p.project_name
        FROM projects_members pm
        JOIN projects p ON p.project_id = pm.project_id
        WHERE pm.user_id = ? AND p.status = 'ACTIVE'
        ORDER BY p.project_name ASC, p.project_id ASC
        """,targetOptionRowMapper(),actorId);
  }

  private org.springframework.jdbc.core.RowMapper<ScheduleTargetOption> targetOptionRowMapper() {
    return (resultSet,rowNumber) -> new ScheduleTargetOption(resultSet.getLong(1),
        resultSet.getString(2));
  }

  private String normalizeQuery(String rawQuery) {
    String normalized = rawQuery == null ? "" : rawQuery.trim().replaceAll("\\s+"," ");
    if (normalized.isEmpty() || normalized.length() > 50) {
      throw new InvalidAttendeeQueryException();
    }
    return normalized;
  }

  private void requireAllActiveUsers(List<Long> userIds) {
    if (userIds.isEmpty()) {
      return;
    }
    Set<Long> active = matchingIds("SELECT user_id FROM users WHERE status = 'ACTIVE'",null,
        Set.copyOf(userIds));
    if (active.size() != Set.copyOf(userIds).size()) {
      throw new InvalidScheduleReferenceException("user reference is inactive or unavailable");
    }
  }

  private void requireAccessibleTeams(long actorId,List<Long> teamIds) {
    if (!memberTeamIds(actorId,Set.copyOf(teamIds)).containsAll(teamIds)) {
      throw new InvalidScheduleReferenceException("team reference is inaccessible");
    }
  }

  private void requireAccessibleProjects(long actorId,List<Long> projectIds) {
    if (!memberProjectIds(actorId,Set.copyOf(projectIds)).containsAll(projectIds)) {
      throw new InvalidScheduleReferenceException("project reference is inaccessible");
    }
  }

  private Set<Long> matchingIds(String baseSql,Long firstParameter,Set<Long> requestedIds) {
    if (requestedIds.isEmpty()) {
      return Set.of();
    }
    String placeholders = requestedIds.stream().map(id -> "?").collect(Collectors.joining(","));
    List<Object> parameters = new ArrayList<>();
    if (firstParameter != null) {
      parameters.add(firstParameter);
    }
    parameters.addAll(requestedIds);
    String idColumn = baseSql.contains("pm.project_id") ? "pm.project_id" : "user_id";
    return Set.copyOf(
        jdbcTemplate.queryForList(baseSql + " AND " + idColumn + " IN (" + placeholders + ")",
            Long.class,parameters.toArray()));
  }

  private List<Long> union(Collection<Long> first,Collection<Long> second) {
    return java.util.stream.Stream.concat(first.stream(),second.stream()).distinct().toList();
  }
}
