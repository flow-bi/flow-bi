package com.flowbi.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
  AUTH_INVALID_CREDENTIALS("AUTH_001", "사번 또는 비밀번호가 일치하지 않습니다.",
      HttpStatus.UNAUTHORIZED), AUTH_TOKEN_INVALID("AUTH_002", "토큰이 유효하지 않습니다.",
          HttpStatus.UNAUTHORIZED), AUTH_REFRESH_TOKEN_REUSED("AUTH_003", "다시 로그인이 필요합니다.",
              HttpStatus.UNAUTHORIZED), AUTH_TOKEN_EXPIRED("AUTH_004", "토큰이 만료되었습니다.",
                  HttpStatus.UNAUTHORIZED), AUTH_ACCESS_DENIED("AUTH_005", "로그인이 필요합니다.",
                      HttpStatus.UNAUTHORIZED), VALIDATION_FAILED("COMMON_001", "요청 값이 올바르지 않습니다.",
                          HttpStatus.BAD_REQUEST), INTERNAL_ERROR("COMMON_999", "서버 오류가 발생했습니다.",
                              HttpStatus.INTERNAL_SERVER_ERROR);

  private final String code;
  private final String message;
  private final HttpStatus status;

  ErrorCode(String code, String message, HttpStatus status) {
    this.code = code;
    this.message = message;
    this.status = status;
  }

  public String getCode() {
    return code;
  }

  public String getMessage() {
    return message;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
