package com.flowbi.domain.auth.service;

import com.flowbi.domain.auth.entity.UserCredential;
import com.flowbi.domain.auth.audit.LoginAuditLogger;
import com.flowbi.domain.auth.dto.AuthenticatedLogin;
import com.flowbi.domain.auth.dto.LoginResult;
import com.flowbi.domain.auth.exception.AuthenticationDependencyUnavailableException;
import com.flowbi.domain.auth.repository.LoginRateLimiter;
import com.flowbi.domain.auth.repository.UserCredentialRepository;
import com.flowbi.domain.user.service.UserAuthentication;
import com.flowbi.domain.user.service.UserService;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class LoginAuthenticationService {
  private static final String DUMMY_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoO6SIbA.mTWR9DYLlf4rU0nAHBSpglkVG";
  private final UserService users;
  private final UserCredentialRepository credentials;
  private final PasswordEncoder passwordEncoder;
  private final LoginRateLimiter rateLimiter;
  private final LoginAuditLogger audit;
  private final SessionGenerationService generations;

  public LoginAuthenticationService(UserService users, UserCredentialRepository credentials,
      PasswordEncoder passwordEncoder, LoginRateLimiter rateLimiter, LoginAuditLogger audit,
      SessionGenerationService generations) {
    this.users = users;
    this.credentials = credentials;
    this.passwordEncoder = passwordEncoder;
    this.rateLimiter = rateLimiter;
    this.audit = audit;
    this.generations = generations;
  }

  public LoginResult authenticate(String employeeNumber,String password,String source,
      boolean hasExistingSessions) {
    String masked = mask(employeeNumber);
    try {
      if (rateLimiter.isLimited(employeeNumber,source)) {
        audit.rateLimited(masked,null);
        return LoginResult.rateLimited();
      }
      Optional<UserAuthentication> user = users.findAuthenticationByEmployeeNumber(employeeNumber);
      Optional<UserCredential> credential = user
          .flatMap(value -> credentials.findByUserUserId(value.userId()));
      boolean valid = passwordEncoder.matches(password,
          credential.map(UserCredential::getPasswordHash).orElse(DUMMY_HASH));
      if (user.isEmpty() || credential.isEmpty() || !valid
          || !"ACTIVE".equals(user.get().status())) {
        rateLimiter.recordFailure(employeeNumber,source);
        audit.failure(masked,null);
        return LoginResult.invalidCredentials();
      }
      rateLimiter.reset(employeeNumber,source);
      long generation = generations.generationForNewSession(String.valueOf(user.get().userId()),
          hasExistingSessions);
      audit.success(masked,null);
      return LoginResult.success(new AuthenticatedLogin(String.valueOf(user.get().userId()),
          credential.get().isMustChangePassword(), generation));
    } catch (RuntimeException exception) {
      audit.dependencyUnavailable(masked,null);
      throw new AuthenticationDependencyUnavailableException(exception);
    }
  }

  private String mask(String employeeNumber) {
    return employeeNumber == null || employeeNumber.length() < 3
        ? "***"
        : "***" + employeeNumber.substring(employeeNumber.length() - 2);
  }
}
