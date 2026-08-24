package com.flowbi.domain.team.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import com.flowbi.domain.team.dto.TeamCreateRequest;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.UUID;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class TeamServiceRollbackIntegrationTest {

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

  @MockBean
  private TeamClosureRepository closures;

  @Test
  void rollsBackTheTeamWhenClosurePersistenceFails() {
    String fixtureName = "Company-" + UUID.randomUUID();
    when(closures.saveAll(anyList())).thenThrow(new DataIntegrityViolationException("failure"));

    assertThatThrownBy(() -> service.create(new TeamCreateRequest(fixtureName, null)))
        .isInstanceOf(DataIntegrityViolationException.class);

    assertThat(teams.findByTeamNameIgnoreCaseAndParentTeamIsNull(fixtureName)).isEmpty();
  }
}
