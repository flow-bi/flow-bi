package com.flowbi.common.exception;

public class BusinessException extends RuntimeException {

  private final ErrorCode errorCode;
  private final String details;

  public BusinessException(ErrorCode errorCode) {
    this(errorCode, errorCode.getMessage());
  }

  public BusinessException(ErrorCode errorCode, String details) {
    super(errorCode.getMessage());
    this.errorCode = errorCode;
    this.details = details;
  }

  public ErrorCode getErrorCode() {
    return errorCode;
  }

  public String getDetails() {
    return details;
  }
}
