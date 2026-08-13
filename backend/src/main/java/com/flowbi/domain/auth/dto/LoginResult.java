package com.flowbi.domain.auth.dto;

public record LoginResult(Status status, AuthenticatedLogin authenticatedLogin) {

  public enum Status {
    SUCCESS, INVALID_CREDENTIALS, RATE_LIMITED
  }

  public static LoginResult success(AuthenticatedLogin authenticatedLogin) {
    return new LoginResult(Status.SUCCESS, authenticatedLogin);
  }

  public static LoginResult invalidCredentials() {
    return new LoginResult(Status.INVALID_CREDENTIALS, null);
  }

  public static LoginResult rateLimited() {
    return new LoginResult(Status.RATE_LIMITED, null);
  }
}
