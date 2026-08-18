package com.flowbi.domain.auth.audit;

public interface PasswordChangeAuditLogger {

  void changed(String userId);

  void failed(String userId);
}
