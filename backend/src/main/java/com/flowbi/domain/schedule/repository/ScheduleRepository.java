package com.flowbi.domain.schedule.repository;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.service.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

  @EntityGraph(attributePaths = {"detail", "targets", "participants"})
  @Query("""
      select distinct schedule from Schedule schedule
      where schedule.status = com.flowbi.domain.schedule.entity.ScheduleStatus.ACTIVE
        and schedule.startAt < :to
        and schedule.endAt > :from
      order by schedule.startAt asc, schedule.id asc
      """)
  List<Schedule> findActiveOverlappingWithAssociations(OffsetDateTime from,OffsetDateTime to);

  @EntityGraph(attributePaths = {"detail", "targets", "participants"})
  @Query("""
      select schedule from Schedule schedule
      where schedule.id = :scheduleId
        and schedule.status = com.flowbi.domain.schedule.entity.ScheduleStatus.ACTIVE
      """)
  Optional<Schedule> findActiveByIdWithAssociations(long scheduleId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @EntityGraph(attributePaths = {"detail", "targets", "participants"})
  @Query("select schedule from Schedule schedule where schedule.id = :scheduleId")
  Optional<Schedule> findByIdWithAssociationsForUpdate(long scheduleId);
}
