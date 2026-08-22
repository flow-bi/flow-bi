package com.flowbi.domain.team.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;

@Entity
@Table(name = "teams")
@Getter
public class Team {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "team_id")
  private Long teamId;

  @Column(name = "team_name", nullable = false, length = 50)
  private String teamName;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "parent_team_id")
  private Team parentTeam;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Team() {
  }

  private Team(String teamName, Team parentTeam) {
    this.teamName = normalizeTeamName(teamName);
    changeParentTeam(parentTeam);
  }

  public static Team create(String teamName) {
    return new Team(teamName, null);
  }

  public static Team create(String teamName,Team parentTeam) {
    return new Team(teamName, parentTeam);
  }

  public void changeName(String teamName) {
    this.teamName = normalizeTeamName(teamName);
  }

  public void changeParentTeam(Team parentTeam) {
    if (parentTeam != null && parentTeam == this) {
      throw new IllegalArgumentException("팀은 자기 자신을 상위 팀으로 지정할 수 없습니다.");
    }
    this.parentTeam = parentTeam;
  }

  @PrePersist
  protected void onCreate() {
    Instant now = Instant.now();
    if (createdAt == null) {
      createdAt = now;
    }
    if (updatedAt == null || updatedAt.isBefore(createdAt)) {
      updatedAt = createdAt;
    }
  }

  @PreUpdate
  protected void onUpdate() {
    Instant now = Instant.now();
    if (updatedAt == null || now.isAfter(updatedAt)) {
      updatedAt = now;
    }
  }

  private static String normalizeTeamName(String teamName) {
    if (teamName == null) {
      throw new IllegalArgumentException("팀 이름은 필수입니다.");
    }
    String normalized = teamName.strip();
    if (normalized.isEmpty() || normalized.length() > 50) {
      throw new IllegalArgumentException("팀 이름은 1자 이상 50자 이하여야 합니다.");
    }
    return normalized;
  }
}
