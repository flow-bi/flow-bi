package com.flowbi.domain.auth.persistence.repository;

import com.flowbi.domain.auth.persistence.entity.AuthUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthUserRepository extends JpaRepository<AuthUser, Long> {

  Optional<AuthUser> findByEmployeeNumber(String employeeNumber);
}
