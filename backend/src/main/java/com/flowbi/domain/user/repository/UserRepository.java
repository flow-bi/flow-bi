package com.flowbi.domain.user.repository;

import com.flowbi.domain.user.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByEmployeeNumber(String employeeNumber);
}
