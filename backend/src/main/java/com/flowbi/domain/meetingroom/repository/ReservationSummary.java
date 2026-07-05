package com.flowbi.domain.meetingroom.repository;

import java.time.LocalDateTime;

public interface ReservationSummary {

  Long getReservationId();

  Long getRoomId();

  Long getScheduleId();

  String getTitle();

  LocalDateTime getStartAt();

  LocalDateTime getEndAt();

  String getStatus();

  LocalDateTime getCancelledAt();

  Integer getCount();

  String getField();

  String getTeamName();
}
