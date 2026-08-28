package com.flowbi.domain.user.service;

import com.flowbi.domain.user.dto.CurrentUserResponse;
import com.flowbi.domain.user.dto.OrganizationChartUserDetailResponse;
import com.flowbi.domain.user.dto.OrganizationChartUserListResponse;
import com.flowbi.domain.user.repository.CurrentUserNameProjection;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.List;
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
  public List<OrganizationChartUserListResponse> getOrganizationChartUsers(Long teamId) {
    if (!userRepository.existsByTeamTeamId(teamId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
    return userRepository.findOrganizationChartUsersByTeamId(teamId).stream()
        .map(user -> new OrganizationChartUserListResponse(user.userId(), user.name(),
            user.position(), user.accountStatus().name(), user.workStatus(),
            user.profileImageUrl()))
        .toList();
  }

  @Transactional(readOnly = true)
  public OrganizationChartUserDetailResponse getOrganizationChartUserDetail(Long userId) {
    var user = userRepository.findOrganizationChartDetailByUserId(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    return new OrganizationChartUserDetailResponse(user.profileImageUrl(), user.name(),
        user.position(), user.team(), user.extensionNumber(), user.email(),
        user.accountStatus().name(), user.workStatus());
  }

  @Transactional(readOnly = true)
  public CurrentUserResponse getCurrentUser(long userId) {
    CurrentUserNameProjection user = userRepository.findActiveNameByUserId(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    return new CurrentUserResponse(user.name());
  }
}
