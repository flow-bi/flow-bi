package com.flowbi.domain.auth.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class AuthUser {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "user_id")
  private Long userId;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "position_id", nullable = false)
  private Position position;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "team_id", nullable = false)
  private Team team;

  @Column(name = "employee_number", nullable = false, unique = true, length = 50)
  private String employeeNumber;

  @Column(nullable = false, length = 50)
  private String name;

  @Column(length = 30)
  private String status;

  protected AuthUser() {
  }

  private AuthUser(String employeeNumber, Position position, Team team) {
    this.employeeNumber = employeeNumber;
    this.position = position;
    this.team = team;
    this.name = "Synthetic Fixture";
    this.status = "ACTIVE";
  }

  public static AuthUser create(String employeeNumber,Position position,Team team) {
    return new AuthUser(employeeNumber, position, team);
  }

  public Long getUserId() {
    return userId;
  }

  public String getEmployeeNumber() {
    return employeeNumber;
  }

  public String getStatus() {
    return status;
  }
}
