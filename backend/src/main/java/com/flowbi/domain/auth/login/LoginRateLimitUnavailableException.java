package com.flowbi.domain.auth.login;

public class LoginRateLimitUnavailableException extends RuntimeException {

  public LoginRateLimitUnavailableException(Throwable cause) {
    super("Login rate limit storage is unavailable", cause);
  }
}
