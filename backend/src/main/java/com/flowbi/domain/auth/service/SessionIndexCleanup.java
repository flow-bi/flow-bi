package com.flowbi.domain.auth.service;

import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

@Component
public class SessionIndexCleanup {

  private final FindByIndexNameSessionRepository<? extends Session> sessionRepository;

  public SessionIndexCleanup(
      FindByIndexNameSessionRepository<? extends Session> sessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  public void deleteAllExcept(String userId,String retainedSessionId) {
    sessionRepository.findByPrincipalName(userId).values().stream().map(Session::getId)
        .filter(sessionId -> !sessionId.equals(retainedSessionId))
        .forEach(sessionRepository::deleteById);
  }
}
