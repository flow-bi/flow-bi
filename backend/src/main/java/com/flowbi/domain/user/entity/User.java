package com.flowbi.domain.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "user_id")
  private Long userId;

  @Column(name = "position_id", nullable = false)
  private Long positionId;

  @Column(name = "team_id", nullable = false)
  private Long teamId;

  @Column(name = "employee_number", nullable = false, length = 50)
  private String employeeNumber;

  @Column(name = "name", nullable = false, length = 50)
  private String name;

  @Column(name = "email")
  private String email;

  @Column(name = "phone_number", length = 20)
  private String phoneNumber;

  @Column(name = "status", length = 30)
  private String status;

  @Column(name = "profile_image_url", length = 512)
  private String profileImageUrl;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  protected User() {
  }

  public User(Long positionId, Long teamId, String employeeNumber, String name) {
    this.positionId = positionId;
    this.teamId = teamId;
    this.employeeNumber = employeeNumber;
    this.name = name;
  }

  public Long getUserId() {
    return userId;
  }

  public String getEmployeeNumber() {
    return employeeNumber;
  }

  public String getName() {
    return name;
  }
}
