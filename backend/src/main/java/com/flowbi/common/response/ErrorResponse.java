package com.flowbi.common.response;

public record ErrorResponse(boolean success, ErrorBody error) {

  public static ErrorResponse of(String code,String message,String details) {
    return new ErrorResponse(false, new ErrorBody(code, message, details));
  }

  public record ErrorBody(String code, String message, String details) {
  }
}
