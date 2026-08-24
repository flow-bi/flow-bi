package com.flowbi.domain.team.controller;

import com.flowbi.domain.auth.dto.AuthenticatedUser;
import com.flowbi.domain.auth.dto.AuthenticatedUser.Role;
import com.flowbi.domain.team.dto.TeamCreateRequest;
import com.flowbi.domain.team.dto.TeamHierarchyResponse;
import com.flowbi.domain.team.dto.TeamNameUpdateRequest;
import com.flowbi.domain.team.dto.TeamMoveRequest;
import com.flowbi.domain.team.dto.TeamPathResponse;
import com.flowbi.domain.team.dto.TeamRelationResponse;
import com.flowbi.domain.team.dto.TeamResponse;
import com.flowbi.domain.team.service.TeamAdministrationService;
import com.flowbi.domain.team.service.TeamHierarchyService;
import com.flowbi.domain.team.service.TeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Teams")
@RestController
@RequestMapping("/api/teams")
public class TeamController {

  private final TeamService teams;
  private final TeamHierarchyService hierarchy;
  private final TeamAdministrationService administration;

  public TeamController(TeamService teams, TeamHierarchyService hierarchy,
      TeamAdministrationService administration) {
    this.teams = teams;
    this.hierarchy = hierarchy;
    this.administration = administration;
  }

  @Operation(summary = "List teams")
  @ApiResponses({@ApiResponse(responseCode = "200", description = "Teams"),
      @ApiResponse(responseCode = "401", description = "Authentication required")})
  @GetMapping
  public List<TeamResponse> findAll(
      @RequestAttribute(value = "authenticatedUser", required = false) @Parameter(hidden = true) AuthenticatedUser actor) {
    requireAuthenticated(actor);
    return teams.findAll().stream().map(TeamResponse::from).toList();
  }

  @GetMapping("/{teamId}")
  public TeamResponse findOne(
      @RequestAttribute(value = "authenticatedUser", required = false) @Parameter(hidden = true) AuthenticatedUser actor,
      @PathVariable Long teamId) {
    requireAuthenticated(actor);
    return TeamResponse.from(teams.findExisting(teamId));
  }

  @GetMapping("/{teamId}/parent")
  public ResponseEntity<TeamRelationResponse> findParent(
      @RequestAttribute(value = "authenticatedUser", required = false) AuthenticatedUser actor,
      @PathVariable Long teamId) {
    requireAuthenticated(actor);
    return hierarchy.findParent(teamId).map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.noContent().build());
  }

  @GetMapping("/{teamId}/children")
  public List<TeamRelationResponse> findChildren(
      @RequestAttribute(value = "authenticatedUser", required = false) AuthenticatedUser actor,
      @PathVariable Long teamId) {
    requireAuthenticated(actor);
    return hierarchy.findChildren(teamId);
  }

  @GetMapping("/{teamId}/ancestors")
  public List<TeamRelationResponse> findAncestors(
      @RequestAttribute(value = "authenticatedUser", required = false) AuthenticatedUser actor,
      @PathVariable Long teamId) {
    requireAuthenticated(actor);
    return hierarchy.findAncestors(teamId);
  }

  @GetMapping("/{teamId}/descendants")
  public List<TeamRelationResponse> findDescendants(
      @RequestAttribute(value = "authenticatedUser", required = false) AuthenticatedUser actor,
      @PathVariable Long teamId) {
    requireAuthenticated(actor);
    return hierarchy.findDescendants(teamId);
  }

  @GetMapping("/{teamId}/path")
  public List<TeamPathResponse> findPath(
      @RequestAttribute(value = "authenticatedUser", required = false) AuthenticatedUser actor,
      @PathVariable Long teamId) {
    requireAuthenticated(actor);
    return hierarchy.findPath(teamId);
  }

  @GetMapping("/{teamId}/tree")
  public TeamHierarchyResponse findTree(
      @RequestAttribute(value = "authenticatedUser", required = false) AuthenticatedUser actor,
      @PathVariable Long teamId) {
    requireAuthenticated(actor);
    return hierarchy.findSubtree(teamId);
  }

  @Operation(summary = "Create a team")
  @ApiResponses({@ApiResponse(responseCode = "201", description = "Created"),
      @ApiResponse(responseCode = "400", description = "Invalid request"),
      @ApiResponse(responseCode = "403", description = "Admin required")})
  @PostMapping
  public ResponseEntity<TeamResponse> create(
      @RequestAttribute(value = "authenticatedUser", required = false) AuthenticatedUser actor,
      @Valid @RequestBody TeamCreateRequest request) {
    requireAdmin(actor);
    return ResponseEntity.status(HttpStatus.CREATED).body(administration.create(actor,request));
  }

  @PatchMapping("/{teamId}/name")
  public TeamResponse updateName(
      @RequestAttribute(value = "authenticatedUser", required = false) AuthenticatedUser actor,
      @PathVariable Long teamId,@Valid @RequestBody TeamNameUpdateRequest request) {
    requireAdmin(actor);
    return administration.rename(actor,teamId,request);
  }

  @PutMapping("/{teamId}/parent")
  public TeamResponse move(
      @RequestAttribute(value = "authenticatedUser", required = false) AuthenticatedUser actor,
      @PathVariable Long teamId,@Valid @RequestBody TeamMoveRequest request) {
    requireAdmin(actor);
    return administration.move(actor,teamId,request);
  }

  @DeleteMapping("/{teamId}")
  public ResponseEntity<Void> delete(
      @RequestAttribute(value = "authenticatedUser", required = false) AuthenticatedUser actor,
      @PathVariable Long teamId) {
    requireAdmin(actor);
    administration.delete(actor,teamId);
    return ResponseEntity.noContent().build();
  }

  private void requireAuthenticated(AuthenticatedUser actor) {
    if (actor == null) {
      throw new TeamAuthenticationRequiredException();
    }
  }

  private void requireAdmin(AuthenticatedUser actor) {
    requireAuthenticated(actor);
    if (actor.role() != Role.ADMIN) {
      throw new com.flowbi.domain.team.service.TeamAdminRequiredException();
    }
  }
}
