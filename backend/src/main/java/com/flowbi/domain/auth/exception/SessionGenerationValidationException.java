package com.flowbi.domain.auth.exception;

public class SessionGenerationValidationException extends RuntimeException {

  public SessionGenerationValidationException() {
    super("Authenticated session is no longer valid");
  }
}
