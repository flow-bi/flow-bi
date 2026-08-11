package com.flowbi.domain.auth.logout;

public interface LogoutAuditLogger {

  void success();

  void noActiveSession();

  void failure();
}
