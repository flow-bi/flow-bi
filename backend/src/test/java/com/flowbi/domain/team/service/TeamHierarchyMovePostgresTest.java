package com.flowbi.domain.team.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.team.dto.TeamCreateRequest;
import com.flowbi.domain.team.dto.TeamMoveRequest;
import com.flowbi.domain.team.dto.TeamResponse;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamHierarchyClosureRow;
import com.flowbi.domain.team.repository.TeamRepository;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
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
class TeamHierarchyMovePostgresTest {

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

  @Test
  void movesASubtreeWithPostgresBulkQueriesAndKeepsEveryClosureDepthCorrect() {
    TeamResponse company = create("Company",null);
    TeamResponse development = create("Development",company.teamId());
    TeamResponse backend = create("Backend",development.teamId());
    TeamResponse platform = create("Platform",company.teamId());

    moves.move(development.teamId(),new TeamMoveRequest(platform.teamId()));

    assertThat(
        teamRepository.findById(development.teamId()).orElseThrow().getParentTeam().getTeamId())
        .isEqualTo(platform.teamId());
    assertThat(fixtureRows(company,development,backend,platform)).containsExactlyInAnyOrder(
        row(company.teamId(),company.teamId(),0),row(development.teamId(),development.teamId(),0),
        row(backend.teamId(),backend.teamId(),0),row(platform.teamId(),platform.teamId(),0),
        row(company.teamId(),platform.teamId(),1),row(platform.teamId(),development.teamId(),1),
        row(development.teamId(),backend.teamId(),1),row(company.teamId(),development.teamId(),2),
        row(platform.teamId(),backend.teamId(),2),row(company.teamId(),backend.teamId(),3));
  }

  @Test
  void movesASubtreeToRootWithoutDeletingItsInternalRelationships() {
    TeamResponse company = create("Company",null);
    TeamResponse development = create("Development",company.teamId());
    TeamResponse backend = create("Backend",development.teamId());

    moves.move(development.teamId(),new TeamMoveRequest(null));

    assertThat(teamRepository.findById(development.teamId()).orElseThrow().getParentTeam())
        .isNull();
    assertThat(fixtureRows(company,development,backend)).containsExactlyInAnyOrder(
        row(company.teamId(),company.teamId(),0),row(development.teamId(),development.teamId(),0),
        row(backend.teamId(),backend.teamId(),0),row(development.teamId(),backend.teamId(),1));
  }

  @Test
  void concurrentCrossMovesLeaveOneConsistentMoveAndOneExplicitConflict() throws Exception {
    TeamResponse company = create("Company",null);
    TeamResponse development = create("Development",company.teamId());
    create("Backend",development.teamId());
    TeamResponse platform = create("Platform",company.teamId());
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService executor = Executors.newFixedThreadPool(2);

    try {
      Future<String> first = executor
          .submit(() -> moveAfter(start,development.teamId(),platform.teamId()));
      Future<String> second = executor
          .submit(() -> moveAfter(start,platform.teamId(),development.teamId()));
      start.countDown();

      assertThat(List.of(first.get(90,TimeUnit.MINUTES),second.get(90,TimeUnit.MINUTES)))
          .containsExactlyInAnyOrder("SUCCESS","CONFLICT");
      assertThat(closures.findAllHierarchyRows()).allSatisfy(row -> {
        if (row.depth() == 0) {
          assertThat(row.ancestorTeamId()).isEqualTo(row.descendantTeamId());
        }
      });
    } finally {
      executor.shutdownNow();
    }
  }

  private TeamResponse create(String name,Long parentTeamId) {
    return teams.create(new TeamCreateRequest(name + "-" + UUID.randomUUID(), parentTeamId));
  }

  private List<TeamHierarchyClosureRow> fixtureRows(TeamResponse... fixtureTeams) {
    Set<Long> fixtureIds = java.util.Arrays.stream(fixtureTeams).map(TeamResponse::teamId)
        .collect(java.util.stream.Collectors.toSet());
    return closures.findAllHierarchyRows().stream()
        .filter(row -> fixtureIds.contains(row.ancestorTeamId())
            && fixtureIds.contains(row.descendantTeamId()))
        .toList();
  }

  private String moveAfter(CountDownLatch start,Long teamId,Long newParentTeamId)
      throws InterruptedException {
    start.await(90,TimeUnit.MINUTES);
    try {
      moves.move(teamId,new TeamMoveRequest(newParentTeamId));
      return "SUCCESS";
    } catch (TeamHierarchyMoveConflictException exception) {
      return "CONFLICT";
    }
  }

  private static TeamHierarchyClosureRow row(Long ancestorId,Long descendantId,int depth) {
    return new TeamHierarchyClosureRow(ancestorId, descendantId, depth);
  }
}
