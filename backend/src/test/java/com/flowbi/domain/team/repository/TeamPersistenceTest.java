package com.flowbi.domain.team.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.entity.TeamClosure;
import com.flowbi.domain.team.entity.TeamClosureId;
import jakarta.persistence.EntityManager;
import java.time.Instant;
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
@Testcontainers(disabledWithoutDocker = true)
class TeamPersistenceTest {

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
  private TeamRepository teams;

  @Autowired
  private TeamClosureRepository closures;

  @Autowired
  private EntityManager entityManager;

  @Test
  void persistsLazyParentTimestampsAndClosureCompositeIdentity() {
    Team parent = teams.save(Team.create("Platform"));
    Team child = teams.save(Team.create("Backend",parent));
    entityManager.flush();

    TeamClosure closure = closures.save(TeamClosure.create(parent,child,1));
    entityManager.flush();
    entityManager.clear();

    Team persistedChild = teams.findById(child.getTeamId()).orElseThrow();
    assertThat(persistedChild.getParentTeam().getTeamId()).isEqualTo(parent.getTeamId());
    assertThat(persistedChild.getCreatedAt()).isInstanceOf(Instant.class);
    assertThat(persistedChild.getUpdatedAt()).isInstanceOf(Instant.class);
    assertThat(closures.findById(new TeamClosureId(parent.getTeamId(), child.getTeamId())))
        .isPresent();
    assertThat(teams.findAllByParentTeamTeamId(parent.getTeamId())).extracting(Team::getTeamId)
        .containsExactly(child.getTeamId());
    assertThat(closures.findAllByDescendantTeamTeamIdOrderByDepthAsc(child.getTeamId()))
        .extracting(TeamClosure::getDepth).containsExactly(1);
  }

  @Test
  void rejectsInvalidClosureDepthAndSelfParentInTheDomainModel() {
    Team team = Team.create("Platform");

    assertThatThrownBy(() -> TeamClosure.create(team,team,1))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> TeamClosure.create(team,Team.create("Backend"),0))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> team.changeParentTeam(team))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
