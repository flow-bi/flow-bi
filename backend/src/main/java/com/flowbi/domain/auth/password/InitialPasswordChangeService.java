package com.flowbi.domain.auth.password;

import com.flowbi.domain.auth.persistence.entity.UserCredential;
import com.flowbi.domain.auth.persistence.repository.UserCredentialRepository;
import com.flowbi.domain.auth.session.SessionGenerationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InitialPasswordChangeService {

  private final UserCredentialRepository credentials;
  private final PasswordEncoder passwordEncoder;
  private final PasswordPolicy passwordPolicy;
  private final SessionGenerationService generations;
  private final PasswordChangeAuditLogger audit;

  public InitialPasswordChangeService(UserCredentialRepository credentials,
      PasswordEncoder passwordEncoder, SessionGenerationService generations,
      PasswordChangeAuditLogger audit) {
    this(credentials, passwordEncoder, new PasswordPolicy(), generations, audit);
  }

  @Autowired
  public InitialPasswordChangeService(UserCredentialRepository credentials,
      PasswordEncoder passwordEncoder, PasswordPolicy passwordPolicy,
      SessionGenerationService generations, PasswordChangeAuditLogger audit) {
    this.credentials = credentials;
    this.passwordEncoder = passwordEncoder;
    this.passwordPolicy = passwordPolicy;
    this.generations = generations;
    this.audit = audit;
  }

  @Transactional
  public long change(String userId,String sessionId,String newPassword,String confirmation) {
    validate(newPassword,confirmation);
    try {
      UserCredential credential = credentials.findByUserUserIdForUpdate(Long.valueOf(userId))
          .orElseThrow(() -> new PasswordChangeException("Password change is not required."));
      if (!credential.isMustChangePassword()) {
        throw new PasswordChangeException("Password change is not required.");
      }
      if (passwordEncoder.matches(newPassword,credential.getPasswordHash())) {
        throw new PasswordChangeException("Temporary password reuse is not allowed.");
      }
      long generation = generations.beginChange(userId,sessionId);
      credential.changePassword(passwordEncoder.encode(newPassword));
      return generation;
    } catch (PasswordChangeException exception) {
      audit.failed(userId);
      throw exception;
    } catch (DataAccessException | NumberFormatException exception) {
      audit.failed(userId);
      throw new PasswordChangeDependencyUnavailableException(exception);
    } catch (RuntimeException exception) {
      audit.failed(userId);
      throw new PasswordChangeDependencyUnavailableException(exception);
    }
  }

  public void complete(String userId,String sessionId) {
    try {
      generations.completeChange(userId,sessionId);
      audit.changed(userId);
    } catch (RuntimeException exception) {
      audit.failed(userId);
      throw new PasswordChangeDependencyUnavailableException(exception);
    }
  }

  private void validate(String newPassword,String confirmation) {
    if (newPassword == null || !newPassword.equals(confirmation)) {
      throw new PasswordChangeException("Password confirmation does not match.");
    }
    if (!passwordPolicy.isValid(newPassword)) {
      throw new PasswordChangeException("Password policy violation.");
    }
  }
}
