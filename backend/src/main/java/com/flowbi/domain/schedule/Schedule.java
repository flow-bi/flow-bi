package com.flowbi.domain.schedule;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * Domain entity used by the query boundary until the approved persistence
 * schema is available.
 */
public final class Schedule {

  private final Long id;
  private final String title;
  private final ScheduleType type;
  private final ScheduleVisibility visibility;
  private final ScheduleColorLabel colorLabel;
  private final boolean allDay;
  private final Instant startAt;
  private final Instant endAt;
  private final Long creatorId;
  private final ScheduleDetail detail;
  private final List<ScheduleTarget> targets;
  private final List<ScheduleAttendee> attendees;
  private final boolean creatorAttending;
  private final ScheduleStatus status;
  private final Instant cancelledAt;
  private final Long cancelledBy;
  private final boolean roomReservationLinked;

  public Schedule(Long id, String title, ScheduleType type, ScheduleVisibility visibility,
      ScheduleColorLabel colorLabel, boolean allDay, Instant startAt, Instant endAt, Long creatorId,
      ScheduleDetail detail, List<ScheduleTarget> targets, List<ScheduleAttendee> attendees,
      boolean creatorAttending, boolean cancelledByRoomReservation) {
    this(id, title, type, visibility, colorLabel, allDay, startAt, endAt, creatorId, detail,
        targets, attendees, creatorAttending, cancelledByRoomReservation, false);
  }

  public Schedule(Long id, String title, ScheduleType type, ScheduleVisibility visibility,
      ScheduleColorLabel colorLabel, boolean allDay, Instant startAt, Instant endAt, Long creatorId,
      ScheduleDetail detail, List<ScheduleTarget> targets, List<ScheduleAttendee> attendees,
      boolean creatorAttending, boolean cancelledByRoomReservation, boolean roomReservationLinked) {
    this.id = Objects.requireNonNull(id,"id is required");
    this.title = Objects.requireNonNull(title,"title is required");
    this.type = Objects.requireNonNull(type,"type is required");
    this.visibility = Objects.requireNonNull(visibility,"visibility is required");
    this.colorLabel = Objects.requireNonNull(colorLabel,"colorLabel is required");
    this.startAt = Objects.requireNonNull(startAt,"startAt is required");
    this.endAt = Objects.requireNonNull(endAt,"endAt is required");
    this.creatorId = Objects.requireNonNull(creatorId,"creatorId is required");
    this.detail = Objects.requireNonNull(detail,"detail is required");
    this.targets = List.copyOf(targets);
    this.attendees = List.copyOf(attendees);
    this.allDay = allDay;
    this.creatorAttending = creatorAttending;
    this.status = cancelledByRoomReservation ? ScheduleStatus.CANCELED : ScheduleStatus.ACTIVE;
    this.cancelledAt = null;
    this.cancelledBy = null;
    this.roomReservationLinked = roomReservationLinked;
    if (!startAt.isBefore(endAt)) {
      throw new IllegalArgumentException("startAt must be before endAt");
    }
    if (visibility != defaultVisibility(type)) {
      throw new IllegalArgumentException("visibility must match schedule type");
    }
  }

  private ScheduleVisibility defaultVisibility(ScheduleType scheduleType) {
    return switch (scheduleType) {
      case PERSONAL -> ScheduleVisibility.PRIVATE;
      case TEAM -> ScheduleVisibility.TEAM;
      case PROJECT -> ScheduleVisibility.PROJECT;
    };
  }

  public boolean overlaps(Instant from,Instant to) {
    return startAt.isBefore(to) && endAt.isAfter(from);
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
  public ScheduleColorLabel getColorLabel() {
    return colorLabel;
  }
  public boolean isAllDay() {
    return allDay;
  }
  public Instant getStartAt() {
    return startAt;
  }
  public Instant getEndAt() {
    return endAt;
  }
  public Long getCreatorId() {
    return creatorId;
  }
  public ScheduleDetail getDetail() {
    return detail;
  }
  public List<ScheduleTarget> getTargets() {
    return targets;
  }
  public List<ScheduleAttendee> getAttendees() {
    return attendees;
  }
  public boolean isCreatorAttending() {
    return creatorAttending;
  }
  public boolean isCancelledByRoomReservation() {
    return isCancelled();
  }
  public boolean isRoomReservationLinked() {
    return roomReservationLinked;
  }

  public boolean isCancelled() {
    return status == ScheduleStatus.CANCELED;
  }

  public ScheduleStatus getStatus() {
    return status;
  }

  public Instant getCancelledAt() {
    return cancelledAt;
  }

  public Long getCancelledBy() {
    return cancelledBy;
  }

  public Schedule cancelledBy(Long actorId,Instant occurredAt) {
    if (isCancelled()) {
      return this;
    }
    return new Schedule(id, title, type, visibility, colorLabel, allDay, startAt, endAt, creatorId,
        detail, targets, attendees, creatorAttending, roomReservationLinked, occurredAt, actorId);
  }

  private Schedule(Long id, String title, ScheduleType type, ScheduleVisibility visibility,
      ScheduleColorLabel colorLabel, boolean allDay, Instant startAt, Instant endAt, Long creatorId,
      ScheduleDetail detail, List<ScheduleTarget> targets, List<ScheduleAttendee> attendees,
      boolean creatorAttending, boolean roomReservationLinked, Instant cancelledAt,
      Long cancelledBy) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.visibility = visibility;
    this.colorLabel = colorLabel;
    this.allDay = allDay;
    this.startAt = startAt;
    this.endAt = endAt;
    this.creatorId = creatorId;
    this.detail = detail;
    this.targets = List.copyOf(targets);
    this.attendees = List.copyOf(attendees);
    this.creatorAttending = creatorAttending;
    this.status = ScheduleStatus.CANCELED;
    this.cancelledAt = Objects.requireNonNull(cancelledAt,"cancelledAt is required");
    this.cancelledBy = Objects.requireNonNull(cancelledBy,"cancelledBy is required");
    this.roomReservationLinked = roomReservationLinked;
  }
}
