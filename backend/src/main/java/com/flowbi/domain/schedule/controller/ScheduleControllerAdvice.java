package com.flowbi.domain.schedule.controller;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;
import com.flowbi.domain.schedule.service.*;

import com.flowbi.domain.schedule.port.InvalidScheduleReferenceException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(assignableTypes = ScheduleController.class)
class ScheduleControllerAdvice {

  @ExceptionHandler(ScheduleActorInactiveException.class)
  ResponseEntity<ErrorResponse> inactiveActor() {
    return error(HttpStatus.FORBIDDEN,"SCHEDULE_ACTOR_INACTIVE","Calendar access is unavailable.");
  }

  @ExceptionHandler(InvalidAttendeeQueryException.class)
  ResponseEntity<ErrorResponse> invalidAttendeeQuery() {
    return error(HttpStatus.BAD_REQUEST,"INVALID_ATTENDEE_QUERY",
        "Search query must be 1 to 50 characters.");
  }

  @ExceptionHandler({InvalidScheduleCreateCommandException.class,
      InvalidScheduleUpdateCommandException.class})
  ResponseEntity<ErrorResponse> invalidCommand(RuntimeException exception) {
    return error(HttpStatus.BAD_REQUEST,"INVALID_SCHEDULE",exception.getMessage());
  }

  @ExceptionHandler(InvalidScheduleReferenceException.class)
  ResponseEntity<ErrorResponse> invalidReference() {
    return error(HttpStatus.BAD_REQUEST,"SCHEDULE_REFERENCE_INVALID",
        "A schedule reference is unavailable.");
  }

  @ExceptionHandler({InvalidScheduleQueryException.class, MethodArgumentTypeMismatchException.class,
      MissingServletRequestParameterException.class, HttpMessageNotReadableException.class})
  ResponseEntity<ErrorResponse> invalidPeriod(Exception exception) {
    return error(HttpStatus.BAD_REQUEST,"INVALID_SCHEDULE_PERIOD",
        "The schedule period is invalid.");
  }

  @ExceptionHandler(ScheduleNotFoundException.class)
  ResponseEntity<ErrorResponse> notFound() {
    return error(HttpStatus.NOT_FOUND,"SCHEDULE_NOT_FOUND","Schedule not found.");
  }

  @ExceptionHandler(RoomReservationManagedScheduleException.class)
  ResponseEntity<ErrorResponse> roomManaged() {
    return error(HttpStatus.CONFLICT,"ROOM_RESERVATION_MANAGED_SCHEDULE",
        "Use the room reservation flow for this schedule.");
  }

  private ResponseEntity<ErrorResponse> error(HttpStatus status,String code,String message) {
    return ResponseEntity.status(status).body(new ErrorResponse(code, message, List.of()));
  }

  record ErrorResponse(String code, String message, List<Object> fieldErrors) {
  }
}
