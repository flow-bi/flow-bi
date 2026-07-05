package com.flowbi.domain.schedule.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "schedule_targets")
public class ScheduleTarget {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "schedule_target_id")
  private Long scheduleTargetId;

  @Column(name = "schedule_id", nullable = false)
  private Long scheduleId;

  @Column(name = "user_id")
  private Long userId;

  @Column(name = "project_id")
  private Long projectId;

  @Column(name = "ancestor_team_id")
  private Long ancestorTeamId;

  @Column(name = "team_id")
  private Long teamId;

  @Enumerated(EnumType.STRING)
  @Column(name = "target_type", nullable = false, length = 30)
  private ScheduleTargetType targetType;

  protected ScheduleTarget() {
  }

  public ScheduleTarget(Long scheduleId, Long userId, Long projectId, Long ancestorTeamId,
      Long teamId, ScheduleTargetType targetType) {
    this.scheduleId = scheduleId;
    this.userId = userId;
    this.projectId = projectId;
    this.ancestorTeamId = ancestorTeamId;
    this.teamId = teamId;
    this.targetType = targetType;
  }

  public ScheduleTargetType getTargetType() {
    return targetType;
  }

  public Long getUserId() {
    return userId;
  }

  public Long getProjectId() {
    return projectId;
  }

  public Long getAncestorTeamId() {
    return ancestorTeamId;
  }

  public Long getTeamId() {
    return teamId;
  }
}
