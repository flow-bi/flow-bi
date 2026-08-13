package com.flowbi.domain.auth.repository;

import java.util.Optional;
import java.util.OptionalLong;

public interface SessionGenerationStore {

  OptionalLong currentGeneration(String userId);

  Optional<String> changeInProgress(String userId);

  long generationForNewSession(String userId,boolean hasExistingSessions);

  long beginChange(String userId,String retainedSessionId);

  void completeChange(String userId);
}
