package com.flowbi.domain.auth.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
class Slf4jLogoutAuditLogger implements LogoutAuditLogger {

  private static final Logger log = LoggerFactory.getLogger("AUTH_AUDIT");

  @Override
  public void success() {
    log.info("logout result=SUCCESS");
  }

  @Override
  public void noActiveSession() {
    log.info("logout result=NO_ACTIVE_SESSION");
  }

  @Override
  public void failure() {
    log.warn("logout result=FAILURE");
  }
}
