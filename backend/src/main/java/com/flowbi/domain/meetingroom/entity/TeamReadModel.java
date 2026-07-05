package com.flowbi.domain.meetingroom.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "teams")
public class TeamReadModel {

  @Id
  @Column(name = "team_id")
  private Long teamId;

  @Column(name = "team_name", nullable = false, length = 100)
  private String teamName;

  @Column(name = "parent_team_id")
  private Long parentTeamId;

  protected TeamReadModel() {
  }
}
