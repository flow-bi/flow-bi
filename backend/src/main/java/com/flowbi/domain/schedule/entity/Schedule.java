package com.flowbi.domain.schedule.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;

@Entity
@Table(name = "schedules")
public class Schedule {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "schedule_id")
  private Long id;

  @Column(nullable = false)
  private String title;

  @Column(name = "schedule_type")
  private String scheduleType;

  private String visibility;

  @Column(name = "start_at", nullable = false)
  private LocalDateTime startAt;

  @Column(name = "end_at", nullable = false)
  private LocalDateTime endAt;

  @Column(name = "creator_id", nullable = false)
  private Long creatorId;

  @Transient
  private ScheduleStatus status;

  protected Schedule() {
  }

  private Schedule(String title, LocalDateTime startAt, LocalDateTime endAt, Long creatorId,
      ScheduleStatus status) {
    this.title = title;
    this.scheduleType = "ROOM_RESERVATION";
    this.visibility = "PARTICIPANTS";
    this.startAt = startAt;
    this.endAt = endAt;
    this.creatorId = creatorId;
    this.status = status;
  }

  public static Schedule roomReservation(String title,LocalDateTime startAt,LocalDateTime endAt,
      Long creatorId,ScheduleStatus status) {
    return new Schedule(title, startAt, endAt, creatorId, status);
  }

  public Long getId() {
    return id;
  }

  public ScheduleStatus getStatus() {
    return status;
  }

  public Long getCreatorId() {
    return creatorId;
  }

  public String getTitle() {
    return title;
  }

  public LocalDateTime getStartAt() {
    return startAt;
  }

  public LocalDateTime getEndAt() {
    return endAt;
  }

  public boolean isRoomReservation() {
    return "ROOM_RESERVATION".equals(scheduleType);
  }

  public void updateRoomReservation(String title,LocalDateTime startAt,LocalDateTime endAt) {
    this.title = title;
    this.startAt = startAt;
    this.endAt = endAt;
  }
}
