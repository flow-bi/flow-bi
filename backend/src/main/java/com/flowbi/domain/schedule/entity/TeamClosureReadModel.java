package com.flowbi.domain.schedule.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@IdClass(TeamClosureId.class)
@Table(name = "teams_closure")
public class TeamClosureReadModel {

  @Id
  @Column(name = "ancestor_team_id")
  private Long ancestorTeamId;

  @Id
  @Column(name = "descendant_team_id")
  private Long descendantTeamId;

  @Column(name = "depth", nullable = false)
  private Integer depth;

  protected TeamClosureReadModel() {
  }
}
