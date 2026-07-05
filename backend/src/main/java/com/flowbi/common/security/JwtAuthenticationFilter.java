package com.flowbi.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowbi.common.exception.BusinessException;
import com.flowbi.common.exception.ErrorCode;
import com.flowbi.common.response.ErrorResponse;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

@Component
public class JwtAuthenticationFilter implements Filter {

  public static final String AUTHENTICATED_USER_ATTRIBUTE = "authenticatedUser";

  private static final Set<String> WHITELIST = Set.of("/api/v1/auth/login","/api/v1/auth/logout",
      "/api/v1/auth/refresh","/v3/api-docs","/swagger-ui","/swagger-ui.html","/h2-console");

  private final JwtProvider jwtProvider;
  private final ObjectMapper objectMapper;

  public JwtAuthenticationFilter(JwtProvider jwtProvider, ObjectMapper objectMapper) {
    this.jwtProvider = jwtProvider;
    this.objectMapper = objectMapper;
  }

  @Override
  public void doFilter(ServletRequest request,ServletResponse response,FilterChain chain)
      throws IOException, ServletException {
    HttpServletRequest httpRequest = (HttpServletRequest) request;
    HttpServletResponse httpResponse = (HttpServletResponse) response;

    if (isWhitelisted(httpRequest.getRequestURI())
        || "OPTIONS".equalsIgnoreCase(httpRequest.getMethod())) {
      chain.doFilter(request,response);
      return;
    }

    String authorization = httpRequest.getHeader(HttpHeaders.AUTHORIZATION);
    if (authorization == null || !authorization.startsWith("Bearer ")) {
      writeError(httpResponse,
          new BusinessException(ErrorCode.AUTH_ACCESS_DENIED, "Authorization 헤더가 필요합니다."));
      return;
    }

    try {
      JwtClaims claims = jwtProvider.parse(authorization.substring(7),JwtTokenType.ACCESS);
      httpRequest.setAttribute(AUTHENTICATED_USER_ATTRIBUTE,claims);
      chain.doFilter(request,response);
    } catch (BusinessException exception) {
      writeError(httpResponse,exception);
    }
  }

  private boolean isWhitelisted(String path) {
    return WHITELIST.stream().anyMatch(path::startsWith);
  }

  private void writeError(HttpServletResponse response,BusinessException exception)
      throws IOException {
    ErrorCode errorCode = exception.getErrorCode();
    response.setStatus(errorCode.getStatus().value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    objectMapper.writeValue(response.getWriter(),
        ErrorResponse.of(errorCode.getCode(),errorCode.getMessage(),exception.getDetails()));
  }
}
