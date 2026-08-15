package com.flowbi.domain.auth.fixture;

import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.service.PositionService;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.service.TeamService;
import com.flowbi.domain.user.service.EmployeeAccountRegistration;
import com.flowbi.domain.user.service.EmployeeAccountRegistrationException;
import com.flowbi.domain.user.service.EmployeeAccountRegistrationRequest;
import com.flowbi.domain.user.service.EmployeeAccountRegistrationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Profile({"local", "test"})
@ConditionalOnProperty(prefix = "auth.test-fixtures", name = "enabled", havingValue = "true")
@RestController
@RequestMapping("/api/dev/auth")
public class DevEmployeeAccountController {

  private final TeamService teams;
  private final PositionService positions;
  private final EmployeeAccountRegistrationService registrations;

  public DevEmployeeAccountController(TeamService teams, PositionService positions,
      EmployeeAccountRegistrationService registrations) {
    this.teams = teams;
    this.positions = positions;
    this.registrations = registrations;
  }

  @GetMapping("/employee-account-options")
  public EmployeeAccountOptions options() {
    return new EmployeeAccountOptions(teams.findAll().stream().map(TeamOption::from).toList(),
        positions.findAll().stream().map(PositionOption::from).toList());
  }

  @PostMapping("/employee-accounts")
  public ResponseEntity<EmployeeAccountResponse> create(
      @Valid @RequestBody CreateEmployeeAccount body) {
    EmployeeAccountRegistration registration = registrations.register(
        new EmployeeAccountRegistrationRequest(body.employeeNumber(), body.email(), body.name(),
            body.teamId(), body.positionId(), body.initialPassword(), body.confirmation()));
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(EmployeeAccountResponse.from(registration));
  }

  @ExceptionHandler(EmployeeAccountRegistrationException.class)
  ResponseEntity<Map<String, Object>> invalid(EmployeeAccountRegistrationException exception) {
    return ResponseEntity.badRequest().body(Map.of("code","EMPLOYEE_ACCOUNT_INVALID","message",
        "Employee account request is invalid.","fieldErrors",List.of()));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<Map<String, Object>> persistenceFailure(
      DataIntegrityViolationException exception) {
    return ResponseEntity.badRequest().body(Map.of("code","EMPLOYEE_ACCOUNT_INVALID","message",
        "Employee account request is invalid.","fieldErrors",List.of()));
  }

  public record CreateEmployeeAccount(@NotBlank @Size(max = 50) String employeeNumber,
      @NotBlank @Size(max = 255) String email, @NotBlank @Size(max = 50) String name,
      @NotNull Long teamId, @NotNull Long positionId,
      @NotBlank @Size(max = 128) String initialPassword,
      @NotBlank @Size(max = 128) String confirmation) {
  }

  public record EmployeeAccountOptions(List<TeamOption> teams, List<PositionOption> positions) {
  }

  public record TeamOption(Long id, String name) {
    static TeamOption from(Team team) {
      return new TeamOption(team.getTeamId(), team.getTeamName());
    }
  }

  public record PositionOption(Long id, String name) {
    static PositionOption from(Position position) {
      return new PositionOption(position.getPositionId(), position.getPositionName());
    }
  }

  public record EmployeeAccountResponse(Long userId, String employeeNumber, String name,
      TeamOption team, PositionOption position, boolean mustChangePassword) {
    static EmployeeAccountResponse from(EmployeeAccountRegistration registration) {
      var user = registration.user();
      return new EmployeeAccountResponse(user.getUserId(), user.getEmployeeNumber(), user.getName(),
          TeamOption.from(user.getTeam()), PositionOption.from(user.getPosition()), true);
    }
  }
}
