package com.flowbi.domain.schedule;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "schedule_participants")
public class ScheduleParticipant {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "schedule_participant_id")
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "schedule_id", nullable = false)
  private Schedule schedule;

  @Column(name = "user_id", nullable = false)
  private long userId;

  protected ScheduleParticipant() {
  }

  ScheduleParticipant(Schedule schedule, long userId) {
    this.schedule = schedule;
    this.userId = userId;
  }

  public long getUserId() {
    return userId;
  }
}
