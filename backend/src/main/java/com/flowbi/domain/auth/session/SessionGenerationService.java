package com.flowbi.domain.auth.session;

import java.util.OptionalLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SessionGenerationService {

  public static final String AUTH_GENERATION_ATTRIBUTE = "AUTH_GENERATION";
  private static final Logger log = LoggerFactory.getLogger(SessionGenerationService.class);

  private final SessionGenerationStore generationStore;
  private final UserSessionCleanup userSessionCleanup;

  public SessionGenerationService(SessionGenerationStore generationStore,
      UserSessionCleanup userSessionCleanup) {
    this.generationStore = generationStore;
    this.userSessionCleanup = userSessionCleanup;
  }

  public long resolveGenerationForNewSession(String userId,boolean hasExistingSessions) {
    return generationStore.resolveGenerationForNewSession(userId,hasExistingSessions);
  }

  public void verifySession(String userId,long sessionGeneration,String sessionId) {
    OptionalLong currentGeneration = generationStore.findCurrentGeneration(userId);
    String retainedSessionId = generationStore.findRetainedSessionId(userId).orElse(null);

    boolean generationMissing = currentGeneration.isEmpty();
    boolean generationMismatch = currentGeneration.isPresent()
        && currentGeneration.getAsLong() != sessionGeneration;
    boolean notRetainedSession = retainedSessionId != null && !retainedSessionId.equals(sessionId);

    if (generationMissing || generationMismatch || notRetainedSession) {
      try {
        userSessionCleanup.deleteAllExcept(userId,retainedSessionId);
      } catch (RuntimeException exception) {
        log.warn("Session index cleanup deferred after logical invalidation");
      }
      throw new SessionGenerationValidationException();
    }
  }

  public long beginChange(String userId,String retainedSessionId) {
    return generationStore.beginPasswordChange(userId,retainedSessionId);
  }

  public void completeChange(String userId) {
    generationStore.completePasswordChange(userId);
  }

  public void completeChange(String userId,String retainedSessionId) {
    try {
      userSessionCleanup.deleteAllExcept(userId,retainedSessionId);
    } catch (RuntimeException exception) {
      log.warn("Session index cleanup deferred after password change");
    }
    generationStore.completePasswordChange(userId);
  }
}
