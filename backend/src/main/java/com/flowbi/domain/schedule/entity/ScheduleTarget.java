package com.flowbi.domain.schedule.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
  private Long id;

  @Column(name = "schedule_id", nullable = false)
  private Long scheduleId;

  @Column(name = "user_id")
  private Long userId;

  @Column(name = "target_type", nullable = false)
  private String targetType;

  protected ScheduleTarget() {
  }

  private ScheduleTarget(Long scheduleId, Long userId) {
    this.scheduleId = scheduleId;
    this.userId = userId;
    this.targetType = "USER";
  }

  public static ScheduleTarget attendee(Long scheduleId,Long userId) {
    return new ScheduleTarget(scheduleId, userId);
  }

  public Long getUserId() {
    return userId;
  }
}
