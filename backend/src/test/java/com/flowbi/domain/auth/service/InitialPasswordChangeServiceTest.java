package com.flowbi.domain.auth.service;

import com.flowbi.domain.auth.audit.PasswordChangeAuditLogger;
import com.flowbi.domain.auth.exception.PasswordChangeDependencyUnavailableException;
import com.flowbi.domain.auth.exception.PasswordChangeException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.auth.entity.UserCredential;
import com.flowbi.domain.auth.repository.UserCredentialRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class InitialPasswordChangeServiceTest {

  @Test
  void rejectsMismatchPolicyViolationAndTemporaryPasswordReuseBeforeChangingSessionState() {
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    SessionGenerationService generations = mock(SessionGenerationService.class);
    InitialPasswordChangeService service = new InitialPasswordChangeService(credentials, encoder,
        generations, mock(PasswordChangeAuditLogger.class));
    UserCredential credential = mock(UserCredential.class);
    when(credentials.findByUserUserIdForUpdate(42L)).thenReturn(Optional.of(credential));
    when(credential.isMustChangePassword()).thenReturn(true);
    when(credential.getPasswordHash()).thenReturn("temporary-hash");
    when(encoder.matches("Temporary1!","temporary-hash")).thenReturn(true);

    assertThatThrownBy(() -> service.change("42","session-1","Temporary1!","different1!"))
        .isInstanceOf(PasswordChangeException.class).hasMessageContaining("confirmation");
    assertThatThrownBy(() -> service.change("42","session-1","short","short"))
        .isInstanceOf(PasswordChangeException.class).hasMessageContaining("policy");
    assertThatThrownBy(() -> service.change("42","session-1","Temporary1!","Temporary1!"))
        .isInstanceOf(PasswordChangeException.class).hasMessageContaining("reuse");
  }

  @Test
  void retainsCurrentSessionAndLogicallyInvalidatesOtherSessionsAfterCredentialUpdate() {
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    SessionGenerationService generations = mock(SessionGenerationService.class);
    PasswordChangeAuditLogger audit = mock(PasswordChangeAuditLogger.class);
    InitialPasswordChangeService service = new InitialPasswordChangeService(credentials, encoder,
        generations, audit);
    UserCredential credential = mock(UserCredential.class);
    when(credentials.findByUserUserIdForUpdate(42L)).thenReturn(Optional.of(credential));
    when(credential.isMustChangePassword()).thenReturn(true);
    when(credential.getPasswordHash()).thenReturn("temporary-hash");
    when(encoder.matches("ValidPassword1!","temporary-hash")).thenReturn(false);
    when(encoder.encode("ValidPassword1!")).thenReturn("new-hash");
    when(generations.beginChange("42","session-1")).thenReturn(7L);

    long generation = service.change("42","session-1","ValidPassword1!","ValidPassword1!");

    assertThat(generation).isEqualTo(7L);
    verify(credential).changePassword("new-hash");
    verify(generations).beginChange("42","session-1");
  }

  @Test
  void failsClosedWhenGenerationStoreCannotBeginTheChange() {
    SessionGenerationService generations = mock(SessionGenerationService.class);
    doThrow(new RuntimeException("redis unavailable")).when(generations).beginChange("42",
        "session-1");
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    UserCredential credential = mock(UserCredential.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    when(credentials.findByUserUserIdForUpdate(42L)).thenReturn(Optional.of(credential));
    when(credential.isMustChangePassword()).thenReturn(true);
    when(credential.getPasswordHash()).thenReturn("temporary-hash");
    when(encoder.matches("ValidPassword1!","temporary-hash")).thenReturn(false);
    InitialPasswordChangeService service = new InitialPasswordChangeService(credentials, encoder,
        generations, mock(PasswordChangeAuditLogger.class));

    assertThatThrownBy(() -> service.change("42","session-1","ValidPassword1!","ValidPassword1!"))
        .isInstanceOf(PasswordChangeDependencyUnavailableException.class);
  }
}
