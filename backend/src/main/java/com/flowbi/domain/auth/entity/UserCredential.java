package com.flowbi.domain.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_credentials", uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_credentials_user_id", columnNames = "user_id")})
public class UserCredential {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "credential_id")
  private Long credentialId;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "password_hash")
  private String passwordHash;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  protected UserCredential() {
  }

  public UserCredential(Long userId, String passwordHash) {
    this.userId = userId;
    this.passwordHash = passwordHash;
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

  public String getPasswordHash() {
    return passwordHash;
  }
}
