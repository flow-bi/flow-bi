package com.flowbi.domain.auth.login;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
class Slf4jLoginAuditLogger implements LoginAuditLogger {
  private static final Logger log = LoggerFactory.getLogger("AUTH_AUDIT");
  @Override
  public void success(String employee,String traceId) {
    log.info("login result=SUCCESS employee={} traceId={}",employee,traceId);
  }
  @Override
  public void failure(String employee,String traceId) {
    log.info("login result=FAILURE employee={} traceId={}",employee,traceId);
  }
  @Override
  public void rateLimited(String employee,String traceId) {
    log.info("login result=RATE_LIMITED employee={} traceId={}",employee,traceId);
  }
  @Override
  public void dependencyUnavailable(String employee,String traceId) {
    log.warn("login result=DEPENDENCY_UNAVAILABLE employee={} traceId={}",employee,traceId);
  }
}
