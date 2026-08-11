package com.flowbi.domain.auth.logout;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class LogoutHandler
    implements
      org.springframework.security.web.authentication.logout.LogoutHandler {

  private final LogoutAuditLogger auditLogger;

  public LogoutHandler(LogoutAuditLogger auditLogger) {
    this.auditLogger = auditLogger;
  }

  @Override
  public void logout(HttpServletRequest request,HttpServletResponse response,
      Authentication authentication) {
    HttpSession session = request.getSession(false);
    if (session == null) {
      auditLogger.noActiveSession();
      return;
    }

    try {
      session.invalidate();
      if (authentication == null) {
        auditLogger.noActiveSession();
      } else {
        auditLogger.success();
      }
    } catch (IllegalStateException exception) {
      auditLogger.failure();
    }
  }
}
