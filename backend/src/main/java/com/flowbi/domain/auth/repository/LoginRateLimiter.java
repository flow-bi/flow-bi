package com.flowbi.domain.auth.repository;

public interface LoginRateLimiter {

  boolean isLimited(String employeeNumber,String source);

  void recordFailure(String employeeNumber,String source);

  void reset(String employeeNumber,String source);
}
