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
  private final SessionIndexCleanup sessionIndexCleanup;

  public SessionGenerationService(SessionGenerationStore generationStore,
      SessionIndexCleanup sessionIndexCleanup) {
    this.generationStore = generationStore;
    this.sessionIndexCleanup = sessionIndexCleanup;
  }

  public long generationForNewSession(String userId,boolean hasExistingSessions) {
    return generationStore.generationForNewSession(userId,hasExistingSessions);
  }

  public void verify(String userId,long sessionGeneration,String sessionId) {
    OptionalLong currentGeneration = generationStore.currentGeneration(userId);
    String retainedSessionId = generationStore.changeInProgress(userId).orElse(null);
    if (currentGeneration.isEmpty() || currentGeneration.getAsLong() != sessionGeneration
        || (retainedSessionId != null && !retainedSessionId.equals(sessionId))) {
      try {
        sessionIndexCleanup.deleteAllExcept(userId,retainedSessionId);
      } catch (RuntimeException exception) {
        log.warn("Session index cleanup deferred after logical invalidation");
      }
      throw new SessionGenerationValidationException();
    }
  }

  public long beginChange(String userId,String retainedSessionId) {
    return generationStore.beginChange(userId,retainedSessionId);
  }

  public void completeChange(String userId) {
    generationStore.completeChange(userId);
  }

  public void completeChange(String userId,String retainedSessionId) {
    try {
      sessionIndexCleanup.deleteAllExcept(userId,retainedSessionId);
    } catch (RuntimeException exception) {
      log.warn("Session index cleanup deferred after password change");
    }
    generationStore.completeChange(userId);
  }
}
