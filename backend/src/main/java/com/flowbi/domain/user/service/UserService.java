package com.flowbi.domain.user.service;

import com.flowbi.domain.user.dto.UserDetailResponse;
import com.flowbi.domain.user.repository.UserDetailProjection;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

  private final UserRepository userRepository;

  public UserService(UserRepository users) {
    this.userRepository = users;
  }

  public Optional<UserAuthentication> findAuthenticationByEmployeeNumber(String employeeNumber) {
    return userRepository.findByEmployeeNumber(employeeNumber)
        .map(user -> new UserAuthentication(user.getUserId(), user.getStatus().name()));
  }

  @Transactional(readOnly = true)
  public UserDetailResponse getUserDetail(Long userId) {
    UserDetailProjection user = userRepository.findActiveDetailByUserId(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    return new UserDetailResponse(user.userId(), user.name(), user.status().name(),
        new UserDetailResponse.TeamDetail(user.teamId(), user.teamName()),
        new UserDetailResponse.PositionDetail(user.positionId(), user.positionName()));
  }
}
