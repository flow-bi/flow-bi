package com.flowbi.domain.auth.audit;

public interface LogoutAuditLogger {

  void success();

  void noActiveSession();

  void failure();
}
