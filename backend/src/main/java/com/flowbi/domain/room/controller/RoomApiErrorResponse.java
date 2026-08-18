package com.flowbi.domain.room.controller;

import java.util.List;

public record RoomApiErrorResponse(String code, String message, List<FieldError> fieldErrors) {

  public record FieldError(String field, String reason) {
  }
}
