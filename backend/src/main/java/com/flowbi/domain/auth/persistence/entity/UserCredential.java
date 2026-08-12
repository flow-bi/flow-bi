package com.flowbi.domain.auth.persistence.entity;

import com.flowbi.domain.user.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_credentials")
public class UserCredential {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "credential_id")
  private Long credentialId;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false, unique = true)
  private User user;

  @Column(name = "password_hash", nullable = false, length = 255)
  private String passwordHash;

  @Column(name = "must_change_password", nullable = false)
  private boolean mustChangePassword = true;

  protected UserCredential() {
  }

  private UserCredential(User user, String passwordHash, boolean mustChangePassword) {
    this.user = user;
    this.passwordHash = passwordHash;
    this.mustChangePassword = mustChangePassword;
  }

  public static UserCredential create(User user,String passwordHash,boolean mustChangePassword) {
    return new UserCredential(user, passwordHash, mustChangePassword);
  }

  public Long getCredentialId() {
    return credentialId;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public boolean isMustChangePassword() {
    return mustChangePassword;
  }

  public void changePassword(String passwordHash) {
    this.passwordHash = passwordHash;
    this.mustChangePassword = false;
  }
}
