package com.flowbi.domain.user.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.entity.UserStatus;
import com.flowbi.domain.user.entity.WorkStatus;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Testcontainers
class UserRepositoryIntegrationTest {

  @Container
  static PostgreSQLContainer<?> postgresql = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url",postgresql::getJdbcUrl);
    registry.add("spring.datasource.username",postgresql::getUsername);
    registry.add("spring.datasource.password",postgresql::getPassword);
    registry.add("spring.datasource.driver-class-name",postgresql::getDriverClassName);
    registry.add("spring.jpa.database-platform",() -> "org.hibernate.dialect.PostgreSQLDialect");
    registry.add("spring.jpa.hibernate.ddl-auto",() -> "validate");
    registry.add("spring.jpa.properties.hibernate.generate_statistics",() -> true);
  }

  @Autowired
  private UserRepository users;

  @Autowired
  private TeamRepository teams;

  @Autowired
  private PositionRepository positions;

  @Autowired
  private jakarta.persistence.EntityManager entityManager;

  @Test
  void fetchesOrganizationChartListAndDetailWithTheRequiredMappingsInOneQueryEach() {
    Position position = positions.save(Position.create("Engineer"));
    Team team = teams.save(Team.create("Platform"));
    User user = users
        .save(User.create("employee-7","employee-7@example.test","Fixture User",position,team));
    entityManager.flush();
    entityManager.clear();
    SessionFactory sessionFactory = entityManager.getEntityManagerFactory()
        .unwrap(SessionFactory.class);
    sessionFactory.getStatistics().clear();

    OrganizationChartUserListProjection listUser = users
        .findOrganizationChartUsersByTeamId(team.getTeamId()).get(0);
    OrganizationChartUserDetailProjection detail = users
        .findOrganizationChartDetailByUserId(user.getUserId()).orElseThrow();

    assertThat(listUser.userId()).isEqualTo(user.getUserId());
    assertThat(listUser.position()).isEqualTo("Engineer");
    assertThat(listUser.accountStatus()).isEqualTo(UserStatus.ACTIVE);
    assertThat(listUser.workStatus()).isEqualTo(WorkStatus.OFFLINE);
    assertThat(detail.name()).isEqualTo("Fixture User");
    assertThat(detail.team()).isEqualTo("Platform");
    assertThat(detail.position()).isEqualTo("Engineer");
    assertThat(detail.accountStatus()).isEqualTo(UserStatus.ACTIVE);
    assertThat(detail.workStatus()).isEqualTo(WorkStatus.OFFLINE);
    assertThat(sessionFactory.getStatistics().getPrepareStatementCount()).isEqualTo(2);
  }

  @Test
  void fetchesOnlyTheActiveUsersNameForTheCurrentUserResponse() {
    Position position = positions.save(Position.create("Engineer"));
    Team team = teams.save(Team.create("Platform"));
    User activeUser = users
        .save(User.create("employee-42","employee-42@example.test","Fixture User",position,team));
    User inactiveUser = users
        .save(User.create("employee-43","employee-43@example.test","Inactive User",position,team));
    inactiveUser.deactivate();
    entityManager.flush();
    entityManager.clear();
    SessionFactory sessionFactory = entityManager.getEntityManagerFactory()
        .unwrap(SessionFactory.class);
    sessionFactory.getStatistics().clear();

    CurrentUserNameProjection currentUser = users.findActiveNameByUserId(activeUser.getUserId())
        .orElseThrow();

    assertThat(currentUser.name()).isEqualTo("Fixture User");
    assertThat(users.findActiveNameByUserId(inactiveUser.getUserId())).isEmpty();
    assertThat(CurrentUserNameProjection.class.getRecordComponents())
        .extracting(component -> component.getName()).containsExactly("name");
    assertThat(sessionFactory.getStatistics().getPrepareStatementCount()).isEqualTo(2);
  }
}
