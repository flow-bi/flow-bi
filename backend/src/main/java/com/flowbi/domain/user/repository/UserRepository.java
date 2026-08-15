package com.flowbi.domain.user.repository;

import com.flowbi.domain.user.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByEmployeeNumber(String employeeNumber);

  Optional<User> findByEmail(String email);

  @Query("select new com.flowbi.domain.user.repository.UserDetailProjection(user.userId, user.name, "
      + "user.status, team.teamId, team.teamName, position.positionId, position.positionName) "
      + "from User user join user.team team join user.position position "
      + "where user.userId = :userId "
      + "and user.status = com.flowbi.domain.user.entity.UserStatus.ACTIVE")
  Optional<UserDetailProjection> findActiveDetailByUserId(@Param("userId") Long userId);
}
