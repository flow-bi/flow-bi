package com.flowbi.domain.auth.service;

import com.flowbi.common.exception.BusinessException;
import com.flowbi.common.exception.ErrorCode;
import com.flowbi.common.security.JwtClaims;
import com.flowbi.common.security.JwtProperties;
import com.flowbi.common.security.JwtProvider;
import com.flowbi.common.security.JwtTokenType;
import com.flowbi.domain.auth.dto.AuthTokenResponse;
import com.flowbi.domain.auth.dto.AuthUserResponse;
import com.flowbi.domain.auth.dto.LoginRequest;
import com.flowbi.domain.auth.entity.UserCredential;
import com.flowbi.domain.auth.entity.UserToken;
import com.flowbi.domain.auth.repository.UserCredentialRepository;
import com.flowbi.domain.auth.repository.UserTokenRepository;
import com.flowbi.domain.user.service.UserAuthInfo;
import com.flowbi.domain.user.service.UserQueryService;
import java.time.LocalDateTime;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

  private final UserQueryService userQueryService;
  private final UserCredentialRepository credentialRepository;
  private final UserTokenRepository tokenRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtProvider jwtProvider;
  private final JwtProperties jwtProperties;

  public AuthService(UserQueryService userQueryService,
      UserCredentialRepository credentialRepository, UserTokenRepository tokenRepository,
      PasswordEncoder passwordEncoder, JwtProvider jwtProvider, JwtProperties jwtProperties) {
    this.userQueryService = userQueryService;
    this.credentialRepository = credentialRepository;
    this.tokenRepository = tokenRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtProvider = jwtProvider;
    this.jwtProperties = jwtProperties;
  }

  public AuthTokenResponse login(LoginRequest request) {
    UserAuthInfo user = userQueryService.findByEmployeeNumber(request.employeeNumber())
        .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS));

    UserCredential credential = credentialRepository.findByUserId(user.userId())
        .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS));

    if (credential.getPasswordHash() == null
        || !passwordEncoder.matches(request.password(),credential.getPasswordHash())) {
      throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    String accessToken = jwtProvider.createAccessToken(user.userId(),user.employeeNumber());
    String refreshToken = jwtProvider.createRefreshToken(user.userId(),user.employeeNumber());
    LocalDateTime expiresAt = LocalDateTime.now().plus(jwtProperties.refreshTokenTtl());

    UserToken userToken = tokenRepository
        .findFirstByUserIdAndDeviceInfo(user.userId(),request.deviceInfo()).orElseGet(
            () -> new UserToken(user.userId(), refreshToken, request.deviceInfo(), expiresAt));
    userToken.rotate(refreshToken,expiresAt);
    tokenRepository.save(userToken);

    return toTokenResponse(accessToken,refreshToken,user);
  }

  public void logout(String refreshToken) {
    tokenRepository.deleteByRefreshToken(refreshToken);
  }

  public AuthTokenResponse refresh(String refreshToken) {
    UserToken storedToken = tokenRepository.findByRefreshToken(refreshToken).orElse(null);
    if (storedToken == null) {
      handleRefreshReuse(refreshToken);
    }

    JwtClaims claims = jwtProvider.parse(refreshToken,JwtTokenType.REFRESH);
    if (!storedToken.getUserId().equals(claims.userId())
        || storedToken.getExpiresAt().isBefore(LocalDateTime.now())) {
      tokenRepository.deleteByUserId(claims.userId());
      throw new BusinessException(ErrorCode.AUTH_TOKEN_EXPIRED, "리프레시 토큰이 만료되었습니다.");
    }

    UserAuthInfo user = userQueryService.findByEmployeeNumber(claims.employeeNumber())
        .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS));

    String newAccessToken = jwtProvider.createAccessToken(user.userId(),user.employeeNumber());
    String newRefreshToken = jwtProvider.createRefreshToken(user.userId(),user.employeeNumber());
    storedToken.rotate(newRefreshToken,LocalDateTime.now().plus(jwtProperties.refreshTokenTtl()));

    return toTokenResponse(newAccessToken,newRefreshToken,user);
  }

  private void handleRefreshReuse(String refreshToken) {
    try {
      Long userId = jwtProvider.readUserIdWithoutExpirationCheck(refreshToken);
      tokenRepository.deleteByUserId(userId);
      throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_REUSED, "이미 사용되었거나 폐기된 리프레시 토큰입니다.");
    } catch (BusinessException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "등록되지 않은 리프레시 토큰입니다.");
    }
  }

  private AuthTokenResponse toTokenResponse(String accessToken,String refreshToken,
      UserAuthInfo user) {
    return new AuthTokenResponse(accessToken, refreshToken, "Bearer",
        jwtProperties.accessTokenTtl().toSeconds(),
        new AuthUserResponse(user.userId(), user.employeeNumber(), user.name()));
  }
}
