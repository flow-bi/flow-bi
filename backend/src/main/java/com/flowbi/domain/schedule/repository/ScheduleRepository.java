package com.flowbi.domain.schedule.repository;

import com.flowbi.domain.schedule.entity.Schedule;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

  @Query(value = """
      SELECT DISTINCT s.*
      FROM schedules s
      WHERE s.start_at < :rangeEnd
        AND s.end_at >= :rangeStart
        AND (
          s.creator_id = :userId
          OR s.visibility = 'PUBLIC'
          OR EXISTS (
            SELECT 1
            FROM schedule_targets st
            WHERE st.schedule_id = s.schedule_id
              AND st.target_type = 'USER'
              AND st.user_id = :userId
          )
          OR EXISTS (
            SELECT 1
            FROM schedule_targets st
            JOIN users u ON u.user_id = :userId
            JOIN teams_closure tc
              ON tc.ancestor_team_id = COALESCE(st.ancestor_team_id, st.team_id)
             AND tc.descendant_team_id = u.team_id
            WHERE st.schedule_id = s.schedule_id
              AND st.target_type = 'TEAM'
          )
          OR EXISTS (
            SELECT 1
            FROM schedule_targets st
            JOIN projects_members pm
              ON pm.project_id = st.project_id
             AND pm.user_id = :userId
            WHERE st.schedule_id = s.schedule_id
              AND st.target_type = 'PROJECT'
          )
        )
      ORDER BY s.start_at ASC, s.schedule_id ASC
      """, nativeQuery = true)
  List<Schedule> findCalendarSchedules(@Param("userId") Long userId,
      @Param("rangeStart") LocalDateTime rangeStart,@Param("rangeEnd") LocalDateTime rangeEnd);
}
