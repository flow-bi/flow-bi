package com.flowbi.domain.schedule.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "schedule_targets")
public class ScheduleTarget {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "schedule_target_id")
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "schedule_id", nullable = false)
  private Schedule schedule;

  @Column(name = "user_id")
  private Long userId;

  @Column(name = "team_id")
  private Long teamId;

  @Column(name = "project_id")
  private Long projectId;

  @Enumerated(EnumType.STRING)
  @Column(name = "target_type", nullable = false, length = 30)
  private ScheduleTargetType type;

  protected ScheduleTarget() {
  }

  private ScheduleTarget(Schedule schedule, ScheduleTargetType type, Long userId, Long teamId,
      Long projectId) {
    this.schedule = schedule;
    this.type = type;
    this.userId = userId;
    this.teamId = teamId;
    this.projectId = projectId;
  }

  static ScheduleTarget user(Schedule schedule,long userId) {
    return new ScheduleTarget(schedule, ScheduleTargetType.USER, userId, null, null);
  }

  static ScheduleTarget team(Schedule schedule,long teamId) {
    return new ScheduleTarget(schedule, ScheduleTargetType.TEAM, null, teamId, null);
  }

  static ScheduleTarget project(Schedule schedule,long projectId) {
    return new ScheduleTarget(schedule, ScheduleTargetType.PROJECT, null, null, projectId);
  }

  public ScheduleTargetType getType() {
    return type;
  }

  public Long getUserId() {
    return userId;
  }

  public Long getTeamId() {
    return teamId;
  }

  public Long getProjectId() {
    return projectId;
  }
}
