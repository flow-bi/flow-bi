package com.flowbi.domain.team.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.flowbi.domain.team.dto.TeamCreateRequest;
import com.flowbi.domain.team.dto.TeamMoveRequest;
import com.flowbi.domain.team.dto.TeamResponse;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamHierarchyClosureRow;
import com.flowbi.domain.team.repository.TeamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class TeamHierarchyMoveRollbackPostgresTest {

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
  private TeamService teams;

  @Autowired
  private TeamHierarchyMoveService moves;

  @Autowired
  private TeamRepository teamRepository;

  @Autowired
  private TeamClosureRepository closures;

  @MockBean
  private TeamHierarchyService hierarchyService;

  @BeforeEach
  void clearHierarchy() {
    closures.deleteAllInBatch();
    teamRepository.deleteAllInBatch();
  }

  @Test
  void rollsBackTheParentAndClosureChangesWhenTheFinalConsistencyCheckFails() {
    TeamResponse company = create("Company",null);
    TeamResponse development = create("Development",company.teamId());
    TeamResponse backend = create("Backend",development.teamId());
    TeamResponse platform = create("Platform",company.teamId());
    when(hierarchyService.findOrganizationTree())
        .thenThrow(new TeamHierarchyInconsistentException());

    assertThatThrownBy(
        () -> moves.move(development.teamId(),new TeamMoveRequest(platform.teamId())))
        .isInstanceOf(TeamHierarchyInconsistentException.class);

    assertThat(
        teamRepository.findById(development.teamId()).orElseThrow().getParentTeam().getTeamId())
        .isEqualTo(company.teamId());
    assertThat(closures.findAllHierarchyRows()).containsExactlyInAnyOrder(
        row(company.teamId(),company.teamId(),0),row(development.teamId(),development.teamId(),0),
        row(backend.teamId(),backend.teamId(),0),row(platform.teamId(),platform.teamId(),0),
        row(company.teamId(),development.teamId(),1),row(development.teamId(),backend.teamId(),1),
        row(company.teamId(),backend.teamId(),2),row(company.teamId(),platform.teamId(),1));
  }

  private TeamResponse create(String name,Long parentTeamId) {
    return teams.create(new TeamCreateRequest(name, parentTeamId));
  }

  private static TeamHierarchyClosureRow row(Long ancestorId,Long descendantId,int depth) {
    return new TeamHierarchyClosureRow(ancestorId, descendantId, depth);
  }
}
