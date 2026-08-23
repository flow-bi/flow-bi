package com.flowbi.domain.team.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.team.service.TeamHierarchyService;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.entity.TeamClosure;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.util.List;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Transactional
@Testcontainers(disabledWithoutDocker = true)
class TeamHierarchyRepositoryTest {

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
    registry.add("spring.jpa.properties.hibernate.generate_statistics",() -> true);
  }

  @Autowired
  private TeamRepository teams;

  @Autowired
  private TeamClosureRepository closures;

  @Autowired
  private EntityManager entityManager;

  @Autowired
  private EntityManagerFactory entityManagerFactory;

  @Autowired
  private TeamHierarchyService hierarchyService;

  @Test
  void readsTeamAndClosureRowsForBothHierarchyDirections() {
    Team headquarters = teams.save(Team.create("Headquarters"));
    Team development = teams.save(Team.create("Development",headquarters));
    Team backend = teams.save(Team.create("Backend",development));
    closures.saveAll(List.of(TeamClosure.create(headquarters,headquarters,0),
        TeamClosure.create(development,development,0),TeamClosure.create(backend,backend,0),
        TeamClosure.create(headquarters,development,1),TeamClosure.create(development,backend,1),
        TeamClosure.create(headquarters,backend,2)));
    entityManager.flush();

    assertThat(teams.findAllHierarchyRows()).extracting(TeamHierarchyTeamRow::teamId)
        .contains(headquarters.getTeamId(),development.getTeamId(),backend.getTeamId());
    assertThat(closures.findAllHierarchyRows()).contains(
        new TeamHierarchyClosureRow(headquarters.getTeamId(), backend.getTeamId(), 2),
        new TeamHierarchyClosureRow(backend.getTeamId(), backend.getTeamId(), 0));
  }

  @Test
  void readsClosureInBothDirectionsWithAscendingDepth() {
    Team headquarters = teams.save(Team.create("Headquarters"));
    Team development = teams.save(Team.create("Development",headquarters));
    Team backend = teams.save(Team.create("Backend",development));
    closures.saveAll(List.of(TeamClosure.create(headquarters,backend,2),
        TeamClosure.create(development,backend,1),TeamClosure.create(backend,backend,0),
        TeamClosure.create(headquarters,development,1),
        TeamClosure.create(development,development,0),
        TeamClosure.create(headquarters,headquarters,0)));
    entityManager.flush();

    assertThat(closures.findAllByAncestorTeamTeamIdOrderByDepthAsc(headquarters.getTeamId()))
        .extracting(closure -> closure.getDescendantTeam().getTeamId())
        .containsExactly(headquarters.getTeamId(),development.getTeamId(),backend.getTeamId());
    assertThat(closures.findAllByDescendantTeamTeamIdOrderByDepthAsc(backend.getTeamId()))
        .extracting(closure -> closure.getAncestorTeam().getTeamId())
        .containsExactly(backend.getTeamId(),development.getTeamId(),headquarters.getTeamId());
  }

  @Test
  void completesPathSubtreeAndOrganizationTreeWithAtMostTwoQueriesEach() {
    Team headquarters = teams.save(Team.create("Headquarters"));
    Team development = teams.save(Team.create("Development",headquarters));
    Team backend = teams.save(Team.create("Backend",development));
    closures.saveAll(List.of(TeamClosure.create(headquarters,headquarters,0),
        TeamClosure.create(development,development,0),TeamClosure.create(backend,backend,0),
        TeamClosure.create(headquarters,development,1),TeamClosure.create(development,backend,1),
        TeamClosure.create(headquarters,backend,2)));
    entityManager.flush();

    assertBatchQueryCount(() -> hierarchyService.findPath(backend.getTeamId()));
    assertBatchQueryCount(() -> hierarchyService.findSubtree(development.getTeamId()));
    assertBatchQueryCount(hierarchyService::findOrganizationTree);
  }

  private void assertBatchQueryCount(Runnable query) {
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    entityManager.clear();
    statistics.clear();

    query.run();

    assertThat(statistics.getQueryExecutionCount()).isLessThanOrEqualTo(2);
  }
}
