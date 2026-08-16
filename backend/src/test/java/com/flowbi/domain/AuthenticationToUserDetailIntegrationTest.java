package com.flowbi.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.auth.credential.UserCredential;
import com.flowbi.domain.auth.login.ratelimit.LoginRateLimiter;
import com.flowbi.domain.auth.session.SessionGenerationStore;
import com.flowbi.domain.auth.credential.UserCredentialRepository;
import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.session.MapSession;
import org.springframework.session.MapSessionRepository;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
@Import(AuthenticationToUserDetailIntegrationTest.TestInfrastructure.class)
class AuthenticationToUserDetailIntegrationTest {

  @Container
  static PostgreSQLContainer<?> postgresql = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url",postgresql::getJdbcUrl);
    registry.add("spring.datasource.username",postgresql::getUsername);
    registry.add("spring.datasource.password",postgresql::getPassword);
    registry.add("spring.datasource.driver-class-name",postgresql::getDriverClassName);
    registry.add("spring.jpa.database-platform",() -> "org.hibernate.dialect.PostgreSQLDialect");
  }

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private UserRepository users;

  @Autowired
  private PositionRepository positions;

  @Autowired
  private TeamRepository teams;

  @Autowired
  private UserCredentialRepository credentials;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Test
  void authenticatesWithARealSessionAndReturnsTheMinimumUserDetail() throws Exception {
    String password = UUID.randomUUID().toString();
    Fixture fixture = user(false,password);
    User user = fixture.user();

    MockHttpSession session = new MockHttpSession();
    MvcResult login = login(session,user.getEmployeeNumber(),password).andExpect(status().isOk())
        .andExpect(jsonPath("$.mustChangePassword").value(false))
        .andExpect(jsonPath("$.password").doesNotExist()).andReturn();

    SecurityContext context = (SecurityContext) session.getAttribute("SPRING_SECURITY_CONTEXT");
    assertThat(context.getAuthentication().getPrincipal()).isInstanceOf(LoginPrincipal.class);
    assertThat(((LoginPrincipal) context.getAuthentication().getPrincipal()).userId())
        .isEqualTo(String.valueOf(user.getUserId()));

    mockMvc.perform(get("/api/users/{userId}",user.getUserId()).session(session))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.userId").value(user.getUserId()))
        .andExpect(jsonPath("$.name").value("Fixture User"))
        .andExpect(jsonPath("$.status").value("ACTIVE"))
        .andExpect(jsonPath("$.team.name").value(fixture.teamName()))
        .andExpect(jsonPath("$.position.name").value(fixture.positionName()))
        .andExpect(jsonPath("$.employeeNumber").doesNotExist())
        .andExpect(jsonPath("$.passwordHash").doesNotExist())
        .andExpect(jsonPath("$.sessionId").doesNotExist());
  }

  @Test
  void rejectsInvalidCredentialsAnonymousPasswordChangeRequiredAndMissingUsers() throws Exception {
    String password = UUID.randomUUID().toString();
    Fixture ordinaryFixture = user(false,password);
    Fixture passwordChangeFixture = user(true,UUID.randomUUID().toString());
    User ordinaryUser = ordinaryFixture.user();
    User passwordChangeUser = passwordChangeFixture.user();

    login(new MockHttpSession(),ordinaryUser.getEmployeeNumber(),UUID.randomUUID().toString())
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    mockMvc.perform(get("/api/users/{userId}",ordinaryUser.getUserId()))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

    MockHttpSession passwordChangeSession = new MockHttpSession();
    login(passwordChangeSession,passwordChangeUser.getEmployeeNumber(),
        passwordChangeFixture.password()).andExpect(status().isOk());
    mockMvc
        .perform(get("/api/users/{userId}",passwordChangeUser.getUserId())
            .session(passwordChangeSession))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));

    MockHttpSession ordinarySession = new MockHttpSession();
    login(ordinarySession,ordinaryUser.getEmployeeNumber(),password).andExpect(status().isOk());
    mockMvc.perform(get("/api/users/{userId}",Long.MAX_VALUE).session(ordinarySession))
        .andExpect(status().isNotFound()).andExpect(header().string("Cache-Control","no-store"));
  }

  private org.springframework.test.web.servlet.ResultActions login(MockHttpSession session,
      String employeeNumber,String password) throws Exception {
    return mockMvc.perform(post("/api/auth/login").with(csrf()).session(session)
        .contentType("application/json").content(
            "{\"employeeNumber\":\"" + employeeNumber + "\",\"password\":\"" + password + "\"}"));
  }

  private Fixture user(boolean mustChangePassword,String password) {
    String fixtureId = UUID.randomUUID().toString().substring(0,8);
    String positionName = "Position " + fixtureId;
    String teamName = "Team " + fixtureId;
    Position position = positions.save(Position.create(positionName));
    Team team = teams.save(Team.create(teamName));
    String employeeNumber = "integration-" + UUID.randomUUID();
    User user = users.save(
        User.create(employeeNumber,employeeNumber + "@example.test","Fixture User",position,team));
    credentials
        .save(UserCredential.create(user,passwordEncoder.encode(password),mustChangePassword));
    return new Fixture(user, password, teamName, positionName);
  }

  private record Fixture(User user, String password, String teamName, String positionName) {
  }

  @TestConfiguration(proxyBeanMethods = false)
  static class TestInfrastructure {

    @Bean
    MapSessionRepository sessionRepository() {
      return new MapSessionRepository(new ConcurrentHashMap<>());
    }

    @Bean
    FindByIndexNameSessionRepository<MapSession> sessionIndexRepository() {
      return new FindByIndexNameSessionRepository<>() {
        @Override
        public MapSession createSession() {
          return new MapSession();
        }

        @Override
        public void save(MapSession session) {
        }

        @Override
        public MapSession findById(String id) {
          return null;
        }

        @Override
        public void deleteById(String id) {
        }

        @Override
        public java.util.Map<String, MapSession> findByIndexNameAndIndexValue(String indexName,
            String indexValue) {
          return java.util.Map.of();
        }
      };
    }

    @Bean
    @Primary
    SessionGenerationStore sessionGenerationStore() {
      return new InMemorySessionGenerationStore();
    }

    @Bean
    @Primary
    LoginRateLimiter loginRateLimiter() {
      return new LoginRateLimiter() {
        @Override
        public boolean isLimited(String employeeNumber,String source) {
          return false;
        }

        @Override
        public void recordFailure(String employeeNumber,String source) {
        }

        @Override
        public void reset(String employeeNumber,String source) {
        }
      };
    }
  }

  static class InMemorySessionGenerationStore implements SessionGenerationStore {
    private final ConcurrentHashMap<String, Long> generations = new ConcurrentHashMap<>();

    @Override
    public java.util.OptionalLong findCurrentGeneration(String userId) {
      Long generation = generations.get(userId);
      return generation == null
          ? java.util.OptionalLong.empty()
          : java.util.OptionalLong.of(generation);
    }

    @Override
    public java.util.Optional<String> findRetainedSessionId(String userId) {
      return java.util.Optional.empty();
    }

    @Override
    public long resolveGenerationForNewSession(String userId,boolean hasExistingSessions) {
      return generations.computeIfAbsent(userId,ignored -> 0L);
    }

    @Override
    public long beginPasswordChange(String userId,String retainedSessionId) {
      return generations.merge(userId,1L,Long::sum);
    }

    @Override
    public void completePasswordChange(String userId) {
    }
  }
}
