package com.flowbi.domain.team.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.flowbi.domain.team.dto.TeamCreateRequest;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
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
class TeamServiceConcurrencyIntegrationTest {

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
  private TeamService service;

  @Autowired
  private TeamRepository teams;

  @Autowired
  private TeamClosureRepository closures;

  @AfterEach
  void cleanUp() {
    closures.deleteAll();
    teams.deleteAll();
  }

  @Test
  void allowsOnlyOneConcurrentRootCreationWithTheSameName() throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      Callable<Boolean> createCompany = () -> {
        try {
          service.create(new TeamCreateRequest("Company", null));
          return true;
        } catch (TeamNameConflictException exception) {
          return false;
        }
      };

      Future<Boolean> first = executor.submit(createCompany);
      Future<Boolean> second = executor.submit(createCompany);

      assertThat(Stream.of(first.get(),second.get()).filter(Boolean::booleanValue)).hasSize(1);
      assertThat(teams.findAll()).hasSize(1);
      assertThat(closures.findAll()).hasSize(1);
    } finally {
      executor.shutdownNow();
    }
  }
}
