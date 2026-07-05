package com.flowbi.domain.user.service;

import java.util.Optional;

public interface UserQueryService {

  Optional<UserAuthInfo> findByEmployeeNumber(String employeeNumber);
}
