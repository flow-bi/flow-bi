package com.flowbi.domain.auth.controller;

import com.flowbi.common.response.ApiResponse;
import com.flowbi.domain.auth.dto.AuthTokenResponse;
import com.flowbi.domain.auth.dto.LoginRequest;
import com.flowbi.domain.auth.dto.LogoutRequest;
import com.flowbi.domain.auth.dto.LogoutResponse;
import com.flowbi.domain.auth.dto.RefreshTokenRequest;
import com.flowbi.domain.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auth", description = "로그인, 로그아웃, 토큰 재발급 API")
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @Operation(summary = "로그인")
  @PostMapping("/login")
  public ApiResponse<AuthTokenResponse> login(@Valid @RequestBody LoginRequest request) {
    return ApiResponse.success(authService.login(request),"로그인되었습니다.");
  }

  @Operation(summary = "로그아웃")
  @PostMapping("/logout")
  public ApiResponse<LogoutResponse> logout(@Valid @RequestBody LogoutRequest request) {
    authService.logout(request.refreshToken());
    return ApiResponse.success(new LogoutResponse(true),"로그아웃되었습니다.");
  }

  @Operation(summary = "토큰 재발급")
  @PostMapping("/refresh")
  public ApiResponse<AuthTokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
    return ApiResponse.success(authService.refresh(request.refreshToken()),"토큰이 재발급되었습니다.");
  }
}
