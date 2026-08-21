package com.flowbi.domain.room.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "rooms_reservations")
public class RoomReservation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "reservation_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "room_id", nullable = false)
  private Room room;

  @Column(name = "schedule_id", nullable = false)
  private Long scheduleId;

  @Column(nullable = false)
  private String title;

  @Column(name = "start_at", nullable = false)
  private LocalDateTime startAt;

  @Column(name = "end_at", nullable = false)
  private LocalDateTime endAt;

  @Enumerated(EnumType.STRING)
  private ReservationStatus status;

  @Column(name = "cancelled_at")
  private LocalDateTime cancelledAt;

  protected RoomReservation() {
  }

  private RoomReservation(Long id, Room room, Long scheduleId, String title, LocalDateTime startAt,
      LocalDateTime endAt, ReservationStatus status) {
    this.id = id;
    this.room = room;
    this.scheduleId = scheduleId;
    this.title = title;
    this.startAt = startAt;
    this.endAt = endAt;
    this.status = status;
  }

  public static RoomReservation of(Long id,Room room,Long scheduleId,String title,
      LocalDateTime startAt,LocalDateTime endAt,ReservationStatus status) {
    return new RoomReservation(id, room, scheduleId, title, startAt, endAt, status);
  }

  public Long getId() {
    return id;
  }

  public Room getRoom() {
    return room;
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

  public void update(Room room,String title,LocalDateTime startAt,LocalDateTime endAt) {
    this.room = room;
    this.title = title;
    this.startAt = startAt;
    this.endAt = endAt;
  }

  public void cancel(LocalDateTime occurredAt) {
    if (status != ReservationStatus.RESERVED) {
      throw new IllegalStateException("Only reserved room reservations can be cancelled");
    }
    status = ReservationStatus.CANCELED;
    cancelledAt = occurredAt;
  }
}
