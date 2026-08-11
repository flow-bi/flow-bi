package com.flowbi.domain.auth.password;

public class PasswordChangeDependencyUnavailableException extends RuntimeException {

  public PasswordChangeDependencyUnavailableException(Throwable cause) {
    super("Password change dependency is unavailable", cause);
  }
}
