package com.flowbi.domain.user.service;

import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.user.dto.UserDetailResponse;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserDetailProjection;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

  private final UserRepository users;

  public UserService(UserRepository users) {
    this.users = users;
  }

  public Optional<UserAuthentication> findAuthenticationByEmployeeNumber(String employeeNumber) {
    return users.findByEmployeeNumber(employeeNumber)
        .map(user -> new UserAuthentication(user.getUserId(), user.getStatus()));
  }

  @Transactional(readOnly = true)
  public UserDetailResponse getUserDetail(Long userId) {
    UserDetailProjection user = users.findActiveDetailByUserId(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    return new UserDetailResponse(user.userId(), user.name(), user.status(),
        new UserDetailResponse.TeamDetail(user.teamId(), user.teamName()),
        new UserDetailResponse.PositionDetail(user.positionId(), user.positionName()));
  }

  public User findOrCreateFixtureUser(String employeeNumber,Position position,Team team) {
    return users.findByEmployeeNumber(employeeNumber)
        .orElseGet(() -> users.save(User.create(employeeNumber,position,team)));
  }
}
