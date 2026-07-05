package com.flowbi.common.exception;

import com.flowbi.common.response.ErrorResponse;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException exception) {
    ErrorCode errorCode = exception.getErrorCode();
    return ResponseEntity.status(errorCode.getStatus())
        .body(ErrorResponse.of(errorCode.getCode(),errorCode.getMessage(),exception.getDetails()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidationException(
      MethodArgumentNotValidException exception) {
    String details = exception.getBindingResult().getFieldErrors().stream()
        .map(this::formatFieldError).collect(Collectors.joining(", "));

    ErrorCode errorCode = ErrorCode.VALIDATION_FAILED;
    return ResponseEntity.status(errorCode.getStatus())
        .body(ErrorResponse.of(errorCode.getCode(),errorCode.getMessage(),details));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleException(Exception exception) {
    ErrorCode errorCode = ErrorCode.INTERNAL_ERROR;
    return ResponseEntity.status(errorCode.getStatus())
        .body(ErrorResponse.of(errorCode.getCode(),errorCode.getMessage(),"관리자에게 문의해주세요."));
  }

  private String formatFieldError(FieldError fieldError) {
    return fieldError.getField() + ": " + fieldError.getDefaultMessage();
  }
}
