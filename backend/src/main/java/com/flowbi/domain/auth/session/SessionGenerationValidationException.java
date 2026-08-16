package com.flowbi.domain.auth.session;

public class SessionGenerationValidationException extends RuntimeException {

  public SessionGenerationValidationException() {
    super("Authenticated session is no longer valid");
  }
}
