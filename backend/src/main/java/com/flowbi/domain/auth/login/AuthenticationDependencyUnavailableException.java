package com.flowbi.domain.auth.login;

public class AuthenticationDependencyUnavailableException extends RuntimeException {
  public AuthenticationDependencyUnavailableException(Throwable cause) {
    super("Authentication dependency is unavailable", cause);
  }
}
