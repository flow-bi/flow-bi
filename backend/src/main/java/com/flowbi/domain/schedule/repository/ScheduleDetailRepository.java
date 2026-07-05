package com.flowbi.domain.schedule.repository;

import com.flowbi.domain.schedule.entity.ScheduleDetail;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleDetailRepository extends JpaRepository<ScheduleDetail, Long> {

  Optional<ScheduleDetail> findByScheduleId(Long scheduleId);

  void deleteByScheduleId(Long scheduleId);
}
