package com.flowbi.domain.room.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "rooms")
public class Room {

  @Id
  @Column(name = "room_id")
  private Long id;

  @Column(name = "room_name", nullable = false)
  private String name;

  private Long capacity;

  private String location;

  protected Room() {
  }

  private Room(Long id, String name, Long capacity, String location) {
    this.id = id;
    this.name = name;
    this.capacity = capacity;
    this.location = location;
  }

  public static Room of(Long id,String name,Long capacity,String location) {
    return new Room(id, name, capacity, location);
  }

  public Long getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public Long getCapacity() {
    return capacity;
  }

  public String getLocation() {
    return location;
  }
}
