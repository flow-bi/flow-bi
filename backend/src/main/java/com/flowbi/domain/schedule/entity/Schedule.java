package com.flowbi.domain.schedule.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "schedules")
public class Schedule {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "schedule_id")
  private Long scheduleId;

  @Column(name = "title", nullable = false, length = 200)
  private String title;

  @Enumerated(EnumType.STRING)
  @Column(name = "schedule_type", length = 30)
  private ScheduleType scheduleType;

  @Enumerated(EnumType.STRING)
  @Column(name = "visibility", length = 30)
  private ScheduleVisibility visibility;

  @Column(name = "start_at", nullable = false)
  private LocalDateTime startAt;

  @Column(name = "end_at", nullable = false)
  private LocalDateTime endAt;

  @Column(name = "creator_id", nullable = false)
  private Long creatorId;

  @Column(name = "color_label", length = 20)
  private String colorLabel;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  protected Schedule() {
  }

  public Schedule(String title, ScheduleType scheduleType, ScheduleVisibility visibility,
      LocalDateTime startAt, LocalDateTime endAt, Long creatorId, String colorLabel) {
    this.title = title;
    this.scheduleType = scheduleType;
    this.visibility = visibility;
    this.startAt = startAt;
    this.endAt = endAt;
    this.creatorId = creatorId;
    this.colorLabel = colorLabel;
  }

  @PrePersist
  void prePersist() {
    LocalDateTime now = LocalDateTime.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = LocalDateTime.now();
  }

  public Long getScheduleId() {
    return scheduleId;
  }

  public String getTitle() {
    return title;
  }

  public ScheduleType getScheduleType() {
    return scheduleType;
  }

  public ScheduleVisibility getVisibility() {
    return visibility;
  }

  public LocalDateTime getStartAt() {
    return startAt;
  }

  public LocalDateTime getEndAt() {
    return endAt;
  }

  public Long getCreatorId() {
    return creatorId;
  }

  public String getColorLabel() {
    return colorLabel;
  }

  public void update(String title,ScheduleType scheduleType,ScheduleVisibility visibility,
      LocalDateTime startAt,LocalDateTime endAt,String colorLabel) {
    this.title = title;
    this.scheduleType = scheduleType;
    this.visibility = visibility;
    this.startAt = startAt;
    this.endAt = endAt;
    this.colorLabel = colorLabel;
  }
}
