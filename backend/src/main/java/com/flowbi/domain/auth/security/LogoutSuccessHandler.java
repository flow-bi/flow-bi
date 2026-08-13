package com.flowbi.domain.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class LogoutSuccessHandler
    implements
      org.springframework.security.web.authentication.logout.LogoutSuccessHandler {

  private final AuthSecurityProperties properties;

  public LogoutSuccessHandler(AuthSecurityProperties properties) {
    this.properties = properties;
  }

  @Override
  public void onLogoutSuccess(HttpServletRequest request,HttpServletResponse response,
      Authentication authentication) {
    ResponseCookie expiredSessionCookie = ResponseCookie.from("SESSION","").path("/").httpOnly(true)
        .secure(properties.getSession().isSecureCookie()).sameSite("Lax").maxAge(0).build();
    response.setHeader(HttpHeaders.SET_COOKIE,expiredSessionCookie.toString());
    response.setStatus(HttpStatus.NO_CONTENT.value());
  }
}
