package com.flowbi.domain.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AbsoluteSessionTimeoutFilter extends OncePerRequestFilter {

  private final AuthSecurityProperties properties;
  private final Clock clock;

  @Autowired
  public AbsoluteSessionTimeoutFilter(AuthSecurityProperties properties) {
    this(properties, Clock.systemUTC());
  }

  AbsoluteSessionTimeoutFilter(AuthSecurityProperties properties, Clock clock) {
    this.properties = properties;
    this.clock = clock;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    HttpSession session = request.getSession(false);
    if (session != null && session.getCreationTime()
        + properties.getSession().getAbsoluteTimeout().toMillis() <= clock.millis()) {
      session.invalidate();
      SecurityContextHolder.clearContext();
    }
    filterChain.doFilter(request,response);
  }
}
