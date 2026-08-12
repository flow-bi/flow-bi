package com.flowbi.domain.schedule.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "schedules_details")
public class ScheduleDetail {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "schedule_details_id")
  private Long id;

  @Column(name = "schedule_id", nullable = false)
  private Long scheduleId;

  private String content;

  private String location;

  protected ScheduleDetail() {
  }

  private ScheduleDetail(Long scheduleId, String content, String location) {
    this.scheduleId = scheduleId;
    this.content = content;
    this.location = location;
  }

  public static ScheduleDetail of(Long scheduleId,String content,String location) {
    return new ScheduleDetail(scheduleId, content, location);
  }

  public void update(String content,String location) {
    this.content = content;
    this.location = location;
  }

  public String getContent() {
    return content;
  }

  public String getLocation() {
    return location;
  }
}
