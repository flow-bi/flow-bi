package com.flowbi.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
  AUTH_INVALID_CREDENTIALS("AUTH_001", "사번 또는 비밀번호가 일치하지 않습니다.",
      HttpStatus.UNAUTHORIZED), AUTH_TOKEN_INVALID("AUTH_002", "토큰이 유효하지 않습니다.",
          HttpStatus.UNAUTHORIZED), AUTH_REFRESH_TOKEN_REUSED("AUTH_003", "다시 로그인이 필요합니다.",
              HttpStatus.UNAUTHORIZED), AUTH_TOKEN_EXPIRED("AUTH_004", "토큰이 만료되었습니다.",
                  HttpStatus.UNAUTHORIZED), AUTH_ACCESS_DENIED("AUTH_005", "로그인이 필요합니다.",
                      HttpStatus.UNAUTHORIZED), SCHEDULE_NOT_FOUND("SCHEDULE_001", "일정을 찾을 수 없습니다.",
                          HttpStatus.NOT_FOUND), SCHEDULE_ACCESS_DENIED("SCHEDULE_002",
                              "일정에 대한 권한이 없습니다.", HttpStatus.FORBIDDEN), SCHEDULE_INVALID_TARGET(
                                  "SCHEDULE_003", "일정 공유 대상이 올바르지 않습니다.",
                                  HttpStatus.BAD_REQUEST), MEETINGROOM_ROOM_NOT_FOUND(
                                      "MEETINGROOM_001", "회의실을 찾을 수 없습니다.",
                                      HttpStatus.NOT_FOUND), MEETINGROOM_RESERVATION_NOT_FOUND(
                                          "MEETINGROOM_002", "회의실 예약을 찾을 수 없습니다.",
                                          HttpStatus.NOT_FOUND), MEETINGROOM_RESERVATION_CONFLICT(
                                              "MEETINGROOM_003", "이미 예약된 시간대입니다.",
                                              HttpStatus.CONFLICT), MEETINGROOM_CANCELLED_RESERVATION(
                                                  "MEETINGROOM_004", "취소된 예약은 수정할 수 없습니다.",
                                                  HttpStatus.BAD_REQUEST), VALIDATION_FAILED(
                                                      "COMMON_001", "요청 값이 올바르지 않습니다.",
                                                      HttpStatus.BAD_REQUEST), INTERNAL_ERROR(
                                                          "COMMON_999", "서버 오류가 발생했습니다.",
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
