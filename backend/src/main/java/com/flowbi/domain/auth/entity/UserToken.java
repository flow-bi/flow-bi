package com.flowbi.domain.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_tokens")
public class UserToken {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "token_id")
  private Long tokenId;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "refresh_token", nullable = false, length = 512)
  private String refreshToken;

  @Column(name = "device_info")
  private String deviceInfo;

  @Column(name = "expires_at", nullable = false)
  private LocalDateTime expiresAt;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  protected UserToken() {
  }

  public UserToken(Long userId, String refreshToken, String deviceInfo, LocalDateTime expiresAt) {
    this.userId = userId;
    this.refreshToken = refreshToken;
    this.deviceInfo = deviceInfo;
    this.expiresAt = expiresAt;
  }

  @PrePersist
  void prePersist() {
    LocalDateTime now = LocalDateTime.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = LocalDateTime.now();
  }

  public Long getUserId() {
    return userId;
  }

  public String getRefreshToken() {
    return refreshToken;
  }

  public String getDeviceInfo() {
    return deviceInfo;
  }

  public LocalDateTime getExpiresAt() {
    return expiresAt;
  }

  public void rotate(String refreshToken,LocalDateTime expiresAt) {
    this.refreshToken = refreshToken;
    this.expiresAt = expiresAt;
  }
}
