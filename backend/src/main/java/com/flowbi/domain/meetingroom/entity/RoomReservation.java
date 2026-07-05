package com.flowbi.domain.meetingroom.entity;

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
@Table(name = "rooms_reservations")
public class RoomReservation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "reservation_id")
  private Long reservationId;

  @Column(name = "room_id", nullable = false)
  private Long roomId;

  @Column(name = "schedule_id", nullable = false)
  private Long scheduleId;

  @Column(name = "title", nullable = false, length = 200)
  private String title;

  @Column(name = "start_at", nullable = false)
  private LocalDateTime startAt;

  @Column(name = "end_at", nullable = false)
  private LocalDateTime endAt;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 30)
  private ReservationStatus status;

  @Column(name = "cancelled_at")
  private LocalDateTime cancelledAt;

  @Column(name = "count")
  private Integer count;

  @Column(name = "field")
  private String field;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  protected RoomReservation() {
  }

  public RoomReservation(Long roomId, Long scheduleId, String title, LocalDateTime startAt,
      LocalDateTime endAt, ReservationStatus status, Integer count, String field) {
    this.roomId = roomId;
    this.scheduleId = scheduleId;
    this.title = title;
    this.startAt = startAt;
    this.endAt = endAt;
    this.status = status;
    this.count = count;
    this.field = field;
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

  public Long getReservationId() {
    return reservationId;
  }

  public Long getRoomId() {
    return roomId;
  }

  public Long getScheduleId() {
    return scheduleId;
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

  public ReservationStatus getStatus() {
    return status;
  }

  public LocalDateTime getCancelledAt() {
    return cancelledAt;
  }

  public Integer getCount() {
    return count;
  }

  public String getField() {
    return field;
  }

  public void update(String title, LocalDateTime startAt, LocalDateTime endAt, Integer count,
      String field) {
    this.title = title;
    this.startAt = startAt;
    this.endAt = endAt;
    this.count = count;
    this.field = field;
  }

  public void cancel() {
    status = ReservationStatus.CANCELLED;
    cancelledAt = LocalDateTime.now();
  }
}
