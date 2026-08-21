package com.flowbi.domain.user.controller;

import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.user.dto.CurrentUserResponse;
import com.flowbi.domain.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class CurrentUserController {

  private final UserService users;

  public CurrentUserController(UserService users) {
    this.users = users;
  }

  @Operation(summary = "현재 인증 사용자 이름 조회")
  @ApiResponses({@ApiResponse(responseCode = "200", description = "현재 사용자 이름"),
      @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content),
      @ApiResponse(responseCode = "403", description = "비밀번호 변경 필요", content = @Content),
      @ApiResponse(responseCode = "404", description = "활성 사용자를 찾을 수 없음", content = @Content)})
  @GetMapping("/api/me/header")
  public ResponseEntity<CurrentUserResponse> getCurrentUser(Authentication authentication) {
    LoginPrincipal principal = requireLoginPrincipal(authentication);
    return ResponseEntity.ok().cacheControl(CacheControl.noStore())
        .body(users.getCurrentUser(toUserId(principal)));
  }

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<Void> handleResponseStatusException(ResponseStatusException exception) {
    return ResponseEntity.status(exception.getStatusCode()).cacheControl(CacheControl.noStore())
        .build();
  }

  private LoginPrincipal requireLoginPrincipal(Authentication authentication) {
    if (authentication != null
        && authentication.getPrincipal() instanceof LoginPrincipal principal) {
      return principal;
    }
    throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  }

  private long toUserId(LoginPrincipal principal) {
    try {
      return Long.parseLong(principal.userId());
    } catch (NumberFormatException exception) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
  }
}
