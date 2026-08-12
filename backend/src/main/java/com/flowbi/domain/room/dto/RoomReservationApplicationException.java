package com.flowbi.domain.room.dto;

public class RoomReservationApplicationException extends RuntimeException {

  private final String code;

  public RoomReservationApplicationException(String code) {
    this.code = code;
  }

  public String code() {
    return code;
  }
}
