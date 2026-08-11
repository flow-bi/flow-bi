package com.flowbi.domain.auth.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "positions")
public class Position {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "position_id")
  private Long positionId;

  @Column(name = "position_name", nullable = false, length = 50)
  private String positionName;

  protected Position() {
  }

  private Position(String positionName) {
    this.positionName = positionName;
  }

  public static Position create(String positionName) {
    return new Position(positionName);
  }
}
