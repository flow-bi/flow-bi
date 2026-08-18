package com.flowbi.domain.auth.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class Slf4jPasswordChangeAuditLogger implements PasswordChangeAuditLogger {

  private static final Logger log = LoggerFactory.getLogger(Slf4jPasswordChangeAuditLogger.class);

  @Override
  public void changed(String userId) {
    log.info("Initial password changed for userId={}",userId);
  }

  @Override
  public void failed(String userId) {
    log.warn("Initial password change failed for userId={}",userId);
  }
}
