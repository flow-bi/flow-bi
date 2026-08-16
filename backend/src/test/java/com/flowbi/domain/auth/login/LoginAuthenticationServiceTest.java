package com.flowbi.domain.auth.login;
import com.flowbi.domain.auth.session.SessionGenerationService;

import com.flowbi.domain.auth.audit.LoginAuditLogger;
import com.flowbi.domain.auth.login.LoginResult;
import com.flowbi.domain.auth.login.AuthenticationDependencyUnavailableException;
import com.flowbi.domain.auth.login.ratelimit.LoginRateLimitUnavailableException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.auth.credential.UserCredential;
import com.flowbi.domain.auth.login.ratelimit.LoginRateLimiter;
import com.flowbi.domain.auth.credential.UserCredentialRepository;
import com.flowbi.domain.user.service.UserAuthentication;
import com.flowbi.domain.user.service.UserService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class LoginAuthenticationServiceTest {

  @Test
  void returnsTheSameGenericFailureForUnknownEmployeeNumberAndWrongPassword() {
    UserService users = mock(UserService.class);
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    LoginRateLimiter limiter = mock(LoginRateLimiter.class);
    LoginAuditLogger audit = mock(LoginAuditLogger.class);
    SessionGenerationService generations = mock(SessionGenerationService.class);
    LoginAuthenticationService service = new LoginAuthenticationService(users, credentials, encoder,
        limiter, audit, generations);
    when(users.findAuthenticationByEmployeeNumber("unknown")).thenReturn(Optional.empty());

    LoginResult unknown = service.authenticate("unknown","Password1!","127.0.0.1",false);

    assertThat(unknown.status()).isEqualTo(LoginResult.Status.INVALID_CREDENTIALS);
    verify(audit).failure(any(),any());
  }

  @Test
  void resetsFailureStateOnlyAfterSuccessfulPasswordValidation() {
    UserService users = mock(UserService.class);
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    LoginRateLimiter limiter = mock(LoginRateLimiter.class);
    LoginAuditLogger audit = mock(LoginAuditLogger.class);
    SessionGenerationService generations = mock(SessionGenerationService.class);
    UserAuthentication user = new UserAuthentication(100L, "ACTIVE");
    UserCredential credential = mock(UserCredential.class);
    when(users.findAuthenticationByEmployeeNumber("E100")).thenReturn(Optional.of(user));
    when(credentials.findByUserUserId(100L)).thenReturn(Optional.of(credential));
    when(credential.getPasswordHash()).thenReturn("hash");
    when(encoder.matches("Password1!","hash")).thenReturn(true);
    when(generations.resolveGenerationForNewSession("100",false)).thenReturn(0L);
    LoginAuthenticationService service = new LoginAuthenticationService(users, credentials, encoder,
        limiter, audit, generations);

    LoginResult result = service.authenticate("E100","Password1!","127.0.0.1",false);

    assertThat(result.status()).isEqualTo(LoginResult.Status.SUCCESS);
    verify(limiter).reset("E100","127.0.0.1");
    verify(audit).success(any(),any());
  }

  @Test
  void rejectsInactiveEmployeesWithTheGenericCredentialsFailure() {
    UserService users = mock(UserService.class);
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    LoginRateLimiter limiter = mock(LoginRateLimiter.class);
    LoginAuditLogger audit = mock(LoginAuditLogger.class);
    SessionGenerationService generations = mock(SessionGenerationService.class);
    UserCredential credential = mock(UserCredential.class);
    when(users.findAuthenticationByEmployeeNumber("E100"))
        .thenReturn(Optional.of(new UserAuthentication(100L, "INACTIVE")));
    when(credentials.findByUserUserId(100L)).thenReturn(Optional.of(credential));
    when(credential.getPasswordHash()).thenReturn("hash");
    when(encoder.matches("Password1!","hash")).thenReturn(true);
    LoginAuthenticationService service = new LoginAuthenticationService(users, credentials, encoder,
        limiter, audit, generations);

    LoginResult result = service.authenticate("E100","Password1!","127.0.0.1",false);

    assertThat(result.status()).isEqualTo(LoginResult.Status.INVALID_CREDENTIALS);
    verify(limiter).recordFailure("E100","127.0.0.1");
    verify(audit).failure(any(),any());
  }

  @Test
  void failsClosedWhenRateLimitStorageIsUnavailable() {
    UserService users = mock(UserService.class);
    LoginRateLimiter limiter = mock(LoginRateLimiter.class);
    LoginAuditLogger audit = mock(LoginAuditLogger.class);
    when(limiter.isLimited("E100","127.0.0.1"))
        .thenThrow(new LoginRateLimitUnavailableException(null));
    LoginAuthenticationService service = new LoginAuthenticationService(users,
        mock(UserCredentialRepository.class), mock(PasswordEncoder.class), limiter, audit,
        mock(SessionGenerationService.class));

    org.assertj.core.api.Assertions
        .assertThatThrownBy(() -> service.authenticate("E100","Password1!","127.0.0.1",false))
        .isInstanceOf(AuthenticationDependencyUnavailableException.class);
    verify(audit).dependencyUnavailable(any(),any());
  }
}
