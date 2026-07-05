package com.flowbi.domain.meetingroom.entity;

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
@Table(name = "rooms")
public class Room {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "room_id")
  private Long roomId;

  @Column(name = "room_name", nullable = false, length = 100)
  private String roomName;

  @Column(name = "capacity")
  private Long capacity;

  @Column(name = "location")
  private String location;

  @Column(name = "field")
  private String field;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  protected Room() {
  }

  public Room(String roomName, Long capacity, String location, String field) {
    this.roomName = roomName;
    this.capacity = capacity;
    this.location = location;
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

  public Long getRoomId() {
    return roomId;
  }

  public String getRoomName() {
    return roomName;
  }

  public Long getCapacity() {
    return capacity;
  }

  public String getLocation() {
    return location;
  }

  public String getField() {
    return field;
  }
}
