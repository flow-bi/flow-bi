package com.flowbi.domain.auth.password;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowbi.domain.auth.login.LoginPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class MustChangePasswordFilter extends OncePerRequestFilter {

  private static final String CSRF_PATH = "/api/auth/csrf";
  private static final String SESSION_PATH = "/api/auth/session";
  private static final String PASSWORD_PATH = "/api/auth/password";
  private static final String LOGOUT_PATH = "/api/auth/logout";

  private final ObjectMapper objectMapper;

  public MustChangePasswordFilter(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication != null && authentication.getPrincipal() instanceof LoginPrincipal principal
        && principal.mustChangePassword() && !isAllowed(request)) {
      response.setStatus(HttpStatus.FORBIDDEN.value());
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      objectMapper.writeValue(response.getOutputStream(),Map.of("code","PASSWORD_CHANGE_REQUIRED",
          "message","Password change is required.","fieldErrors",List.of()));
      return;
    }
    filterChain.doFilter(request,response);
  }

  private boolean isAllowed(HttpServletRequest request) {
    String method = request.getMethod();
    String requestUri = request.getRequestURI();
    if (HttpMethod.GET.matches(method)) {
      return CSRF_PATH.equals(requestUri) || SESSION_PATH.equals(requestUri);
    }
    if (HttpMethod.PUT.matches(method)) {
      return PASSWORD_PATH.equals(requestUri);
    }
    return HttpMethod.POST.matches(method) && LOGOUT_PATH.equals(requestUri);
  }
}
