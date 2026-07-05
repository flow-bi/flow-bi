package com.flowbi.domain.schedule.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "projects")
public class Project {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "project_id")
  private Long projectId;

  @Column(name = "project_name", nullable = false, length = 50)
  private String projectName;

  @Column(name = "description")
  private String description;

  @Column(name = "status", length = 30)
  private String status;

  protected Project() {
  }
}
