package com.flowbi.domain.auth.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "teams")
public class Team {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "team_id")
  private Long teamId;

  @Column(name = "team_name", nullable = false, length = 50)
  private String teamName;

  protected Team() {
  }

  private Team(String teamName) {
    this.teamName = teamName;
  }

  public static Team create(String teamName) {
    return new Team(teamName);
  }
}
