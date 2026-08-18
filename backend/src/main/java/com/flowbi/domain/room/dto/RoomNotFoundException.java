package com.flowbi.domain.room.dto;

public class RoomNotFoundException extends RuntimeException {

  private static final String CODE = "ROOM_NOT_FOUND";

  public RoomNotFoundException() {
    super("회의실을 찾을 수 없습니다.");
  }

  public String code() {
    return CODE;
  }
}
