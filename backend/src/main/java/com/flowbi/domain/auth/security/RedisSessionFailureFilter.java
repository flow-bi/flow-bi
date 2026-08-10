package com.flowbi.domain.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RedisSessionFailureFilter extends OncePerRequestFilter {

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return !request.getRequestURI().startsWith("/api/");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    try {
      filterChain.doFilter(request,response);
    } catch (RedisConnectionFailureException exception) {
      response.resetBuffer();
      response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      response.setHeader("Cache-Control","no-store");
      response.getWriter().write(
          "{\"code\":\"AUTH_SESSION_UNAVAILABLE\",\"message\":\"Authentication session is unavailable.\",\"fieldErrors\":[]}");
    }
  }
}
