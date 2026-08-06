package com.flowbi.domain.schedule;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "schedules")
public class Schedule {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "schedule_id")
  private Long id;

  @Column(nullable = false, length = 200)
  private String title;

  @Enumerated(EnumType.STRING)
  @Column(name = "schedule_type", nullable = false, length = 30)
  private ScheduleType type;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private ScheduleVisibility visibility;

  @Column(name = "start_at", nullable = false)
  private OffsetDateTime startAt;

  @Column(name = "end_at", nullable = false)
  private OffsetDateTime endAt;

  @Column(name = "creator_id", nullable = false)
  private long creatorId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private ScheduleStatus status;

  @Column(name = "cancelled_at")
  private OffsetDateTime cancelledAt;

  @Column(name = "cancelled_by")
  private Long cancelledBy;

  @Column(name = "is_all_day", nullable = false)
  private boolean allDay;

  @Enumerated(EnumType.STRING)
  @Column(name = "color_label", nullable = false, length = 30)
  private ScheduleColorLabel colorLabel;

  @Column(name = "creator_attends", nullable = false)
  private boolean creatorAttends;

  @OneToOne(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
  private ScheduleDetail detail;

  @OneToMany(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  private final Set<ScheduleTarget> targets = new LinkedHashSet<>();

  @OneToMany(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  private final Set<ScheduleParticipant> participants = new LinkedHashSet<>();

  protected Schedule() {
  }

  public static Schedule create(ScheduleCreateCommand command) {
    Schedule schedule = new Schedule();
    schedule.title = command.title();
    schedule.type = command.type();
    schedule.visibility = command.visibility();
    schedule.startAt = command.startAt();
    schedule.endAt = command.endAt();
    schedule.creatorId = command.creatorId();
    schedule.status = ScheduleStatus.ACTIVE;
    schedule.allDay = command.allDay();
    schedule.colorLabel = command.colorLabel();
    schedule.creatorAttends = command.creatorAttends();
    schedule.detail = new ScheduleDetail(schedule, command.content(), command.location());
    command.participantIds()
        .forEach(userId -> schedule.participants.add(new ScheduleParticipant(schedule, userId)));
    command.userTargetIds()
        .forEach(userId -> schedule.targets.add(ScheduleTarget.user(schedule,userId)));
    command.teamTargetIds()
        .forEach(teamId -> schedule.targets.add(ScheduleTarget.team(schedule,teamId)));
    command.projectTargetIds()
        .forEach(projectId -> schedule.targets.add(ScheduleTarget.project(schedule,projectId)));
    return schedule;
  }

  public Long getId() {
    return id;
  }

  public String getTitle() {
    return title;
  }

  public ScheduleType getType() {
    return type;
  }

  public ScheduleVisibility getVisibility() {
    return visibility;
  }

  public OffsetDateTime getStartAt() {
    return startAt;
  }

  public OffsetDateTime getEndAt() {
    return endAt;
  }

  public long getCreatorId() {
    return creatorId;
  }

  public ScheduleStatus getStatus() {
    return status;
  }

  public boolean isAllDay() {
    return allDay;
  }

  public ScheduleColorLabel getColorLabel() {
    return colorLabel;
  }

  public boolean isCreatorAttends() {
    return creatorAttends;
  }

  public ScheduleDetail getDetail() {
    return detail;
  }

  public int attendeeCount() {
    return participants.size() + (creatorAttends ? 1 : 0);
  }

  public List<ScheduleTarget> getTargets() {
    return List.copyOf(targets);
  }

  public List<ScheduleParticipant> getParticipants() {
    return List.copyOf(participants);
  }

  public OffsetDateTime getCancelledAt() {
    return cancelledAt;
  }

  public Long getCancelledBy() {
    return cancelledBy;
  }

  void update(ScheduleUpdateCommand command) {
    title = command.title();
    type = command.type();
    visibility = command.visibility();
    startAt = command.startAt();
    endAt = command.endAt();
    allDay = command.allDay();
    colorLabel = command.colorLabel();
    creatorAttends = command.creatorAttends();
    detail.update(command.content(),command.location());
    targets.clear();
    participants
        .removeIf(participant -> !command.participantIds().contains(participant.getUserId()));
    Set<Long> existingParticipantIds = participants.stream().map(ScheduleParticipant::getUserId)
        .collect(Collectors.toSet());
    command.participantIds().stream().filter(userId -> !existingParticipantIds.contains(userId))
        .forEach(userId -> participants.add(new ScheduleParticipant(this, userId)));
    command.userTargetIds().forEach(userId -> targets.add(ScheduleTarget.user(this,userId)));
    command.teamTargetIds().forEach(teamId -> targets.add(ScheduleTarget.team(this,teamId)));
    command.projectTargetIds()
        .forEach(projectId -> targets.add(ScheduleTarget.project(this,projectId)));
  }

  void cancel(long actorId,OffsetDateTime occurredAt) {
    if (status != ScheduleStatus.ACTIVE) {
      throw new IllegalStateException("Only active schedules can be cancelled");
    }
    status = ScheduleStatus.CANCELED;
    cancelledAt = occurredAt;
    cancelledBy = actorId;
  }
}
