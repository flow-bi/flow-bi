package com.flowbi.domain.auth.exception;

public class LoginRateLimitUnavailableException extends RuntimeException {

  public LoginRateLimitUnavailableException(Throwable cause) {
    super("Login rate limit storage is unavailable", cause);
  }
}
