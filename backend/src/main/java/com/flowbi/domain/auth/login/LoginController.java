package com.flowbi.domain.auth.login;

import com.flowbi.domain.auth.login.AuthenticatedLogin;
import com.flowbi.domain.auth.login.LoginRequest;
import com.flowbi.domain.auth.login.LoginResult;
import com.flowbi.domain.auth.login.AuthenticationDependencyUnavailableException;
import com.flowbi.domain.auth.login.LoginAuthenticationService;
import com.flowbi.domain.auth.session.SessionGenerationService;
import com.flowbi.domain.auth.security.LoginPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class LoginController {
  private final LoginAuthenticationService authenticationService;
  private final HttpSessionSecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

  public LoginController(LoginAuthenticationService authenticationService) {
    this.authenticationService = authenticationService;
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest login,HttpServletRequest request,
      HttpServletResponse response) {
    LoginResult result = authenticationService.authenticate(login.employeeNumber(),login.password(),
        source(request),false);

    if (result.status() == LoginResult.Status.RATE_LIMITED)
      return error(HttpStatus.TOO_MANY_REQUESTS,"LOGIN_RATE_LIMITED",
          "Login is temporarily unavailable.");

    if (result.status() == LoginResult.Status.INVALID_CREDENTIALS)
      return error(HttpStatus.UNAUTHORIZED,"INVALID_CREDENTIALS",
          "Invalid employee number or password.");

    HttpSession session = request.getSession(true);
    request.changeSessionId();

    AuthenticatedLogin authenticated = result.authenticatedLogin();
    LoginPrincipal principal = new LoginPrincipal(authenticated.userId(),
        authenticated.mustChangePassword());

    UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(principal,
        null, principal.getAuthorities());

    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(token);
    SecurityContextHolder.setContext(context);
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,
        authenticated.generation());

    contextRepository.saveContext(context,request,response);
    return ResponseEntity.ok(Map.of("mustChangePassword",authenticated.mustChangePassword()));
  }

  @ExceptionHandler(AuthenticationDependencyUnavailableException.class)
  ResponseEntity<Map<String, Object>> unavailable() {
    return error(HttpStatus.SERVICE_UNAVAILABLE,"AUTH_DEPENDENCY_UNAVAILABLE",
        "Authentication is temporarily unavailable.");
  }

  private ResponseEntity<Map<String, Object>> error(HttpStatus status,String code,String message) {
    return ResponseEntity.status(status)
        .body(Map.of("code",code,"message",message,"fieldErrors",List.of()));
  }

  private String source(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    return forwarded == null || forwarded.isBlank()
        ? request.getRemoteAddr()
        : forwarded.split(",",2)[0].trim();
  }
}
