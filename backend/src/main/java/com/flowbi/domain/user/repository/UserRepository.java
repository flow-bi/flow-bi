package com.flowbi.domain.user.repository;

import com.flowbi.domain.user.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByEmployeeNumber(String employeeNumber);

  Optional<User> findByEmail(String email);

  @Query("select new com.flowbi.domain.user.repository.OrganizationChartUserListProjection("
      + "user.userId, user.name, position.positionName, user.status, user.workStatus, "
      + "user.profileImageUrl) from User user join user.position position "
      + "where user.team.teamId = :teamId order by user.name asc, user.userId asc")
  List<OrganizationChartUserListProjection> findOrganizationChartUsersByTeamId(
      @Param("teamId") Long teamId);

  boolean existsByTeamTeamId(Long teamId);

  @Query("select new com.flowbi.domain.user.repository.OrganizationChartUserDetailProjection("
      + "user.profileImageUrl, user.name, position.positionName, team.teamName, "
      + "user.phoneNumber, user.email, user.status, user.workStatus) "
      + "from User user join user.position position join user.team team where user.userId = :userId")
  Optional<OrganizationChartUserDetailProjection> findOrganizationChartDetailByUserId(
      @Param("userId") Long userId);

  @Query("select new com.flowbi.domain.user.repository.CurrentUserNameProjection(user.name) "
      + "from User user where user.userId = :userId "
      + "and user.status = com.flowbi.domain.user.entity.UserStatus.ACTIVE")
  Optional<CurrentUserNameProjection> findActiveNameByUserId(@Param("userId") Long userId);
}
