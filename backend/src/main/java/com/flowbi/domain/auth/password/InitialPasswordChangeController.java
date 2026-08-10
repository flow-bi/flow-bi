package com.flowbi.domain.auth.password;

import com.flowbi.domain.auth.login.LoginPrincipal;
import com.flowbi.domain.auth.session.SessionGenerationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class InitialPasswordChangeController {

  private final InitialPasswordChangeService passwordChangeService;
  private final HttpSessionSecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

  public InitialPasswordChangeController(InitialPasswordChangeService passwordChangeService) {
    this.passwordChangeService = passwordChangeService;
  }

  @PutMapping("/password")
  public ResponseEntity<Map<String, Boolean>> change(
      @Valid @RequestBody PasswordChangeRequest request,Authentication authentication,
      HttpServletRequest servletRequest,HttpServletResponse response) {
    if (!(authentication.getPrincipal() instanceof LoginPrincipal principal)
        || !principal.mustChangePassword()) {
      throw new PasswordChangeException("Password change is not required.");
    }
    HttpSession session = servletRequest.getSession(false);
    if (session == null) {
      throw new PasswordChangeDependencyUnavailableException(new IllegalStateException());
    }
    long generation = passwordChangeService.change(principal.userId(),session.getId(),
        request.newPassword(),request.confirmation());
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,generation);
    LoginPrincipal updatedPrincipal = new LoginPrincipal(principal.userId(), false);
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(new UsernamePasswordAuthenticationToken(updatedPrincipal, null,
        updatedPrincipal.getAuthorities()));
    SecurityContextHolder.setContext(context);
    contextRepository.saveContext(context,servletRequest,response);
    passwordChangeService.complete(principal.userId(),session.getId());
    return ResponseEntity.ok(Map.of("mustChangePassword",false));
  }

  @ExceptionHandler(PasswordChangeException.class)
  ResponseEntity<Map<String, Object>> invalid(PasswordChangeException exception) {
    String code = exception.getMessage().contains("confirmation")
        ? "PASSWORD_CONFIRMATION_MISMATCH"
        : exception.getMessage().contains("policy")
            ? "PASSWORD_POLICY_VIOLATION"
            : exception.getMessage().contains("reuse")
                ? "PASSWORD_REUSE_FORBIDDEN"
                : "PASSWORD_CHANGE_NOT_REQUIRED";
    return error(HttpStatus.BAD_REQUEST,code,"Password change request is invalid.");
  }

  @ExceptionHandler(PasswordChangeDependencyUnavailableException.class)
  ResponseEntity<Map<String, Object>> unavailable() {
    return error(HttpStatus.SERVICE_UNAVAILABLE,"PASSWORD_CHANGE_UNAVAILABLE",
        "Password change is temporarily unavailable.");
  }

  private ResponseEntity<Map<String, Object>> error(HttpStatus status,String code,String message) {
    return ResponseEntity.status(status)
        .body(Map.of("code",code,"message",message,"fieldErrors",List.of()));
  }
}
