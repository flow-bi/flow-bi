package com.flowbi.domain.auth.password;

public interface PasswordChangeAuditLogger {

  void changed(String userId);

  void failed(String userId);
}
