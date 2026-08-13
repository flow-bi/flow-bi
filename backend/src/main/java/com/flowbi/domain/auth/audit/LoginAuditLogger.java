package com.flowbi.domain.auth.audit;

public interface LoginAuditLogger {
  void success(String maskedEmployeeNumber,String traceId);
  void failure(String maskedEmployeeNumber,String traceId);
  void rateLimited(String maskedEmployeeNumber,String traceId);
  void dependencyUnavailable(String maskedEmployeeNumber,String traceId);
}
