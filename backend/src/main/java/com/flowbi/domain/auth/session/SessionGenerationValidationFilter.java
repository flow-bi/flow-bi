package com.flowbi.domain.auth.session;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SessionGenerationValidationFilter extends OncePerRequestFilter {

  private final SessionGenerationService sessionGenerationService;

  public SessionGenerationValidationFilter(SessionGenerationService sessionGenerationService) {
    this.sessionGenerationService = sessionGenerationService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || authentication instanceof AnonymousAuthenticationToken) {
      filterChain.doFilter(request,response);
      return;
    }

    HttpSession session = request.getSession(false);
    Object generation = session == null
        ? null
        : session.getAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE);
    if (!(generation instanceof Number)) {
      rejectUnauthenticated(response);
      return;
    }

    try {
      sessionGenerationService.verify(authentication.getName(),((Number) generation).longValue(),
          session.getId());
    } catch (SessionGenerationValidationException exception) {
      SecurityContextHolder.clearContext();
      rejectUnauthenticated(response);
      return;
    } catch (SessionGenerationStoreUnavailableException exception) {
      SecurityContextHolder.clearContext();
      rejectUnavailable(response);
      return;
    }
    filterChain.doFilter(request,response);
  }

  private void rejectUnauthenticated(HttpServletResponse response) throws IOException {
    response.setStatus(HttpStatus.UNAUTHORIZED.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setHeader("Cache-Control","no-store");
    response.getWriter().write(
        "{\"code\":\"UNAUTHENTICATED\",\"message\":\"Authentication is required.\",\"fieldErrors\":[]}");
  }

  private void rejectUnavailable(HttpServletResponse response) throws IOException {
    response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setHeader("Cache-Control","no-store");
    response.getWriter().write(
        "{\"code\":\"AUTH_SESSION_UNAVAILABLE\",\"message\":\"Authentication session is unavailable.\",\"fieldErrors\":[]}");
  }
}
