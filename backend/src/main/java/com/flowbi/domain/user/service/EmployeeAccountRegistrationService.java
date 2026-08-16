package com.flowbi.domain.user.service;

import com.flowbi.domain.auth.service.PasswordPolicy;
import com.flowbi.domain.auth.entity.UserCredential;
import com.flowbi.domain.auth.repository.UserCredentialRepository;
import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.service.PositionService;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.service.TeamService;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EmployeeAccountRegistrationService {

  private final UserRepository users;
  private final TeamService teams;
  private final PositionService positions;
  private final UserCredentialRepository credentials;
  private final PasswordEncoder passwordEncoder;
  private final PasswordPolicy passwordPolicy;

  public EmployeeAccountRegistrationService(UserRepository users, TeamService teams,
      PositionService positions, UserCredentialRepository credentials,
      PasswordEncoder passwordEncoder, PasswordPolicy passwordPolicy) {
    this.users = users;
    this.teams = teams;
    this.positions = positions;
    this.credentials = credentials;
    this.passwordEncoder = passwordEncoder;
    this.passwordPolicy = passwordPolicy;
  }

  @Transactional
  public EmployeeAccountRegistration register(EmployeeAccountRegistrationRequest request) {
    validate(request);
    String employeeNumber = request.employeeNumber().trim();
    if (users.findByEmployeeNumber(employeeNumber).isPresent()) {
      throw new EmployeeAccountRegistrationException("Employee number is already registered.");
    }
    String email = request.email().trim();
    if (users.findByEmail(email).isPresent()) {
      throw new EmployeeAccountRegistrationException("Email is already registered.");
    }
    Team team = findTeam(request.teamId());
    Position position = findPosition(request.positionId());
    return create(employeeNumber,email,request.name().trim(),team,position,
        request.initialPassword(),true);
  }

  private EmployeeAccountRegistration create(String employeeNumber,String email,String name,
      Team team,Position position,String initialPassword,boolean mustChangePassword) {
    User user = users.save(User.create(employeeNumber,email,name,position,team));
    credentials.save(
        UserCredential.create(user,passwordEncoder.encode(initialPassword),mustChangePassword));
    return new EmployeeAccountRegistration(user, mustChangePassword);
  }

  private Team findTeam(Long teamId) {
    try {
      return teams.findExisting(teamId);
    } catch (ResponseStatusException exception) {
      throw new EmployeeAccountRegistrationException("Team does not exist.");
    }
  }

  private Position findPosition(Long positionId) {
    try {
      return positions.findExisting(positionId);
    } catch (ResponseStatusException exception) {
      throw new EmployeeAccountRegistrationException("Position does not exist.");
    }
  }

  private void validate(EmployeeAccountRegistrationRequest request) {
    if (request == null || !StringUtils.hasText(request.employeeNumber())
        || request.employeeNumber().trim().length() > 50 || !StringUtils.hasText(request.email())
        || !StringUtils.hasText(request.name()) || request.name().trim().length() > 50
        || request.teamId() == null || request.teamId() <= 0 || request.positionId() == null
        || request.positionId() <= 0) {
      throw new EmployeeAccountRegistrationException("Employee account request is invalid.");
    }
    if (request.initialPassword() == null
        || !request.initialPassword().equals(request.confirmation())) {
      throw new EmployeeAccountRegistrationException("Password confirmation does not match.");
    }
    if (!passwordPolicy.isValid(request.initialPassword())) {
      throw new EmployeeAccountRegistrationException("Password policy violation.");
    }
  }
}
