package com.flowbi.domain.room.dto;

public class RoomQueryValidationException extends RuntimeException {

  private static final String CODE = "ROOM_QUERY_INVALID";

  public RoomQueryValidationException() {
    super("회의실 조회 조건이 올바르지 않습니다.");
  }

  public String code() {
    return CODE;
  }
}
