package com.flowbi.domain.schedule.entity;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;
import com.flowbi.domain.schedule.service.*;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "schedules_details")
public class ScheduleDetail {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "schedule_details_id")
  private Long id;

  @OneToOne(optional = false)
  @JoinColumn(name = "schedule_id", nullable = false, unique = true)
  private Schedule schedule;

  @Column(length = 200)
  private String content;

  @Column(length = 30)
  private String location;

  protected ScheduleDetail() {
  }

  ScheduleDetail(Schedule schedule, String content, String location) {
    this.schedule = schedule;
    this.content = content;
    this.location = location;
  }

  public String getContent() {
    return content;
  }

  public String getLocation() {
    return location;
  }

  void update(String content,String location) {
    this.content = content;
    this.location = location;
  }
}
