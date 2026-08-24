package com.flowbi.domain.team.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.team.dto.TeamCreateRequest;
import com.flowbi.domain.team.dto.TeamResponse;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamHierarchyClosureRow;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class TeamDeletionPostgresTest {

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url",POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username",POSTGRES::getUsername);
    registry.add("spring.datasource.password",POSTGRES::getPassword);
    registry.add("spring.datasource.driver-class-name",POSTGRES::getDriverClassName);
    registry.add("spring.jpa.database-platform",() -> "org.hibernate.dialect.PostgreSQLDialect");
    registry.add("spring.jpa.hibernate.ddl-auto",() -> "validate");
  }

  @Autowired
  private TeamService teamService;

  @Autowired
  private TeamDeletionService deletionService;

  @Autowired
  private TeamRepository teams;

  @Autowired
  private TeamClosureRepository closures;

  @Autowired
  private UserRepository users;

  @Autowired
  private PositionRepository positions;

  @BeforeEach
  void clearData() {
    users.deleteAllInBatch();
    closures.deleteAllInBatch();
    teams.deleteAllInBatch();
    positions.deleteAllInBatch();
  }

  @Test
  void deletesOnlyTheLeafAndItsClosureWhilePreservingOtherHierarchyRelationships() {
    TeamResponse company = create("Company",null);
    TeamResponse development = create("Development",company.teamId());
    TeamResponse backend = create("Backend",development.teamId());
    TeamResponse platform = create("Platform",company.teamId());

    deletionService.delete(backend.teamId());

    assertThat(teams.findById(backend.teamId())).isEmpty();
    assertThat(closures.findAllHierarchyRows()).containsExactlyInAnyOrder(
        row(company.teamId(),company.teamId(),0),row(development.teamId(),development.teamId(),0),
        row(platform.teamId(),platform.teamId(),0),row(company.teamId(),development.teamId(),1),
        row(company.teamId(),platform.teamId(),1));
    assertThat(teams.findById(development.teamId()).orElseThrow().getParentTeam().getTeamId())
        .isEqualTo(company.teamId());
  }

  @Test
  void keepsTeamAndClosureUntouchedWhenItHasDirectChildren() {
    TeamResponse company = create("Company",null);
    TeamResponse development = create("Development",company.teamId());
    TeamResponse backend = create("Backend",development.teamId());
    List<TeamHierarchyClosureRow> before = closures.findAllHierarchyRows();

    assertThatThrownBy(() -> deletionService.delete(development.teamId()))
        .isInstanceOf(TeamHasChildrenException.class);

    assertThat(teams.findById(development.teamId())).isPresent();
    assertThat(teams.findById(backend.teamId())).isPresent();
    assertThat(closures.findAllHierarchyRows()).containsExactlyInAnyOrderElementsOf(before);
  }

  @Test
  void translatesEmployeeForeignKeyFailureAndRollsBackClosureDeletion() {
    TeamResponse company = create("Company",null);
    TeamResponse backend = create("Backend",company.teamId());
    Position position = positions.saveAndFlush(Position.create("Engineer"));
    users.saveAndFlush(User.create("employee-1","employee-1@example.test","Employee",position,
        teams.findById(backend.teamId()).orElseThrow()));
    List<TeamHierarchyClosureRow> before = closures.findAllHierarchyRows();

    assertThatThrownBy(() -> deletionService.delete(backend.teamId()))
        .isInstanceOf(TeamInUseException.class);

    assertThat(teams.findById(backend.teamId())).isPresent();
    assertThat(closures.findAllHierarchyRows()).containsExactlyInAnyOrderElementsOf(before);
    assertThat(users.findByEmployeeNumber("employee-1")).isPresent();
  }

  private TeamResponse create(String name,Long parentTeamId) {
    return teamService.create(new TeamCreateRequest(name, parentTeamId));
  }

  private static TeamHierarchyClosureRow row(Long ancestorId,Long descendantId,int depth) {
    return new TeamHierarchyClosureRow(ancestorId, descendantId, depth);
  }
}
