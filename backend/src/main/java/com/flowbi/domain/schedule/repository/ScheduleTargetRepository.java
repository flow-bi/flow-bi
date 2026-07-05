package com.flowbi.domain.schedule.repository;

import com.flowbi.domain.schedule.entity.ScheduleTarget;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleTargetRepository extends JpaRepository<ScheduleTarget, Long> {

  List<ScheduleTarget> findByScheduleId(Long scheduleId);

  void deleteByScheduleId(Long scheduleId);
}
