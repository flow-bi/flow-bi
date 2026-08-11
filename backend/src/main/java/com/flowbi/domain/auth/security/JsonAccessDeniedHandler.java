package com.flowbi.domain.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;

class JsonAccessDeniedHandler implements AccessDeniedHandler {

  private final ObjectMapper objectMapper;

  JsonAccessDeniedHandler(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public void handle(HttpServletRequest request,HttpServletResponse response,
      AccessDeniedException accessDeniedException) throws IOException {
    String code = accessDeniedException instanceof CsrfException
        ? "CSRF_VALIDATION_FAILED"
        : "FORBIDDEN";
    String message = accessDeniedException instanceof CsrfException
        ? "CSRF validation failed."
        : "Access is denied.";
    response.setStatus(HttpStatus.FORBIDDEN.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(response.getOutputStream(),
        Map.of("code",code,"message",message,"fieldErrors",List.of()));
  }
}
