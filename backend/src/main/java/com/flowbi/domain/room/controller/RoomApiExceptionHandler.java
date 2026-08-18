package com.flowbi.domain.room.controller;

import com.flowbi.domain.room.dto.RoomNotFoundException;
import com.flowbi.domain.room.dto.RoomQueryValidationException;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice(assignableTypes = RoomController.class)
public class RoomApiExceptionHandler {

  @ExceptionHandler(AuthenticationRequiredException.class)
  ResponseEntity<RoomApiErrorResponse> authenticationRequired(
      AuthenticationRequiredException error) {
    return response(HttpStatus.UNAUTHORIZED,error.code(),"인증이 필요합니다.");
  }

  @ExceptionHandler({RoomQueryValidationException.class, MethodArgumentTypeMismatchException.class,
      MissingServletRequestParameterException.class})
  ResponseEntity<RoomApiErrorResponse> invalidQuery(Exception error) {
    return response(HttpStatus.BAD_REQUEST,"ROOM_QUERY_INVALID","회의실 조회 조건이 올바르지 않습니다.");
  }

  @ExceptionHandler(RoomNotFoundException.class)
  ResponseEntity<RoomApiErrorResponse> roomNotFound(RoomNotFoundException error) {
    return response(HttpStatus.NOT_FOUND,error.code(),"회의실을 찾을 수 없습니다.");
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<RoomApiErrorResponse> invalidReservationBody(
      HttpMessageNotReadableException error) {
    return response(HttpStatus.BAD_REQUEST,"ROOM_RESERVATION_INVALID","회의실 예약 입력이 올바르지 않습니다.");
  }

  @ExceptionHandler(RoomReservationApplicationException.class)
  ResponseEntity<RoomApiErrorResponse> reservationError(RoomReservationApplicationException error) {
    HttpStatus status = reservationErrorStatus(error.code());
    return response(status,error.code(),reservationErrorMessage(error.code()));
  }

  private HttpStatus reservationErrorStatus(String code) {
    return switch (code) {
      case "ROOM_NOT_FOUND", "ROOM_RESERVATION_NOT_FOUND" -> HttpStatus.NOT_FOUND;
      case "RESERVATION_PARTICIPANT_FORBIDDEN" -> HttpStatus.FORBIDDEN;
      case "ROOM_CAPACITY_EXCEEDED", "ROOM_RESERVATION_CONFLICT", "ROOM_RESERVATION_NOT_EDITABLE" ->
        HttpStatus.CONFLICT;
      default -> HttpStatus.BAD_REQUEST;
    };
  }

  private String reservationErrorMessage(String code) {
    return switch (code) {
      case "ROOM_NOT_FOUND" -> "회의실을 찾을 수 없습니다.";
      case "RESERVATION_PARTICIPANT_FORBIDDEN" -> "참석자를 예약에 추가할 권한이 없습니다.";
      case "ROOM_CAPACITY_EXCEEDED" -> "회의실 수용 인원을 초과했습니다.";
      case "ROOM_RESERVATION_CONFLICT" -> "선택한 시간에 회의실을 예약할 수 없습니다.";
      case "ROOM_RESERVATION_NOT_FOUND" -> "요청한 회의실 예약을 찾을 수 없습니다.";
      case "ROOM_RESERVATION_NOT_EDITABLE" -> "수정할 수 없는 회의실 예약입니다.";
      default -> "회의실 예약 입력이 올바르지 않습니다.";
    };
  }

  private ResponseEntity<RoomApiErrorResponse> response(HttpStatus status,String code,
      String message) {
    return ResponseEntity.status(status).body(new RoomApiErrorResponse(code, message, List.of()));
  }
}
