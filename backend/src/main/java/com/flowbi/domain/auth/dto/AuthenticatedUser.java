package com.flowbi.domain.auth.dto;

/**
 * HTTP 경계에서 검증된 현재 사용자를 나타낸다.
 *
 * <p>
 * 실제 인증 Adapter가 구현되기 전까지 Controller는 이 객체가 요청 속성으로 제공될 때만 보호된 동작을 수행한다.
 * </p>
 */
public record AuthenticatedUser(Long userId, Role role) {

  public AuthenticatedUser {
    if (userId == null || userId < 1 || role == null) {
      throw new IllegalArgumentException("Authenticated user must contain a valid ID and role");
    }
  }

  public enum Role {
    USER, ADMIN
  }
}
