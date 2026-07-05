package com.flowbi.domain.user.service;

import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserQueryServiceImpl implements UserQueryService {

  private final UserRepository userRepository;

  public UserQueryServiceImpl(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public Optional<UserAuthInfo> findByEmployeeNumber(String employeeNumber) {
    return userRepository.findByEmployeeNumber(employeeNumber).map(this::toAuthInfo);
  }

  private UserAuthInfo toAuthInfo(User user) {
    return new UserAuthInfo(user.getUserId(), user.getEmployeeNumber(), user.getName());
  }
}
