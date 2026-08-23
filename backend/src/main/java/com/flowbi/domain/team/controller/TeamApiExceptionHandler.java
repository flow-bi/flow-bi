package com.flowbi.domain.team.controller;

import com.flowbi.domain.team.dto.TeamValidationException;
import com.flowbi.domain.team.service.TeamAdminRequiredException;
import com.flowbi.domain.team.service.TeamHasChildrenException;
import com.flowbi.domain.team.service.TeamHierarchyInconsistentException;
import com.flowbi.domain.team.service.TeamHierarchyMoveConflictException;
import com.flowbi.domain.team.service.TeamInUseException;
import com.flowbi.domain.team.service.TeamNameConflictException;
import com.flowbi.domain.team.service.TeamNotFoundException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(assignableTypes = TeamController.class)
public class TeamApiExceptionHandler {

  @ExceptionHandler(TeamAuthenticationRequiredException.class)
  ResponseEntity<TeamApiErrorResponse> unauthenticated() {
    return error(HttpStatus.UNAUTHORIZED,"UNAUTHENTICATED","Authentication is required.");
  }

  @ExceptionHandler(TeamAdminRequiredException.class)
  ResponseEntity<TeamApiErrorResponse> adminRequired() {
    return error(HttpStatus.FORBIDDEN,"TEAM_ADMIN_REQUIRED","Administrator access is required.");
  }

  @ExceptionHandler({TeamValidationException.class, IllegalArgumentException.class,
      HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
  ResponseEntity<TeamApiErrorResponse> invalidRequest(Exception exception) {
    return error(HttpStatus.BAD_REQUEST,"TEAM_INVALID","The team request is invalid.");
  }

  @ExceptionHandler(TeamNotFoundException.class)
  ResponseEntity<TeamApiErrorResponse> notFound() {
    return error(HttpStatus.NOT_FOUND,"TEAM_NOT_FOUND","The requested team was not found.");
  }

  @ExceptionHandler(TeamNameConflictException.class)
  ResponseEntity<TeamApiErrorResponse> nameConflict() {
    return error(HttpStatus.CONFLICT,"TEAM_NAME_CONFLICT","The team name is already in use.");
  }

  @ExceptionHandler(TeamHierarchyMoveConflictException.class)
  ResponseEntity<TeamApiErrorResponse> moveConflict() {
    return error(HttpStatus.CONFLICT,"TEAM_MOVE_CONFLICT",
        "The team move conflicts with the hierarchy.");
  }

  @ExceptionHandler(TeamHasChildrenException.class)
  ResponseEntity<TeamApiErrorResponse> hasChildren() {
    return error(HttpStatus.CONFLICT,"TEAM_HAS_CHILDREN","A team with children cannot be deleted.");
  }

  @ExceptionHandler(TeamInUseException.class)
  ResponseEntity<TeamApiErrorResponse> inUse() {
    return error(HttpStatus.CONFLICT,"TEAM_IN_USE","A team assigned to users cannot be deleted.");
  }

  @ExceptionHandler(TeamHierarchyInconsistentException.class)
  ResponseEntity<TeamApiErrorResponse> inconsistent() {
    return error(HttpStatus.INTERNAL_SERVER_ERROR,"TEAM_HIERARCHY_INCONSISTENT",
        "The team hierarchy is unavailable.");
  }

  private ResponseEntity<TeamApiErrorResponse> error(HttpStatus status,String code,String message) {
    return ResponseEntity.status(status).body(new TeamApiErrorResponse(code, message, List.of()));
  }
}
