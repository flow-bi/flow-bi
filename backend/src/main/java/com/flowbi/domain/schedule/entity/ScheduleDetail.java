package com.flowbi.domain.schedule.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "schedules_details")
public class ScheduleDetail {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "schedule_details_id")
  private Long scheduleDetailsId;

  @Column(name = "schedule_id", nullable = false)
  private Long scheduleId;

  @Column(name = "content", length = 200)
  private String content;

  @Column(name = "location", length = 30)
  private String location;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  protected ScheduleDetail() {
  }

  public ScheduleDetail(Long scheduleId, String content, String location) {
    this.scheduleId = scheduleId;
    this.content = content;
    this.location = location;
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

  public String getContent() {
    return content;
  }

  public String getLocation() {
    return location;
  }

  public void update(String content,String location) {
    this.content = content;
    this.location = location;
  }
}
