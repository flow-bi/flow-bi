package com.flowbi.domain.team.repository;

import com.flowbi.domain.team.entity.Team;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, Long> {

  Optional<Team> findByTeamNameIgnoreCaseAndParentTeamIsNull(String teamName);

  boolean existsByParentTeamIsNullAndTeamNameIgnoreCase(String teamName);

  boolean existsByParentTeamTeamIdAndTeamNameIgnoreCase(Long parentTeamId,String teamName);

  boolean existsByParentTeamIsNullAndTeamNameIgnoreCaseAndTeamIdNot(String teamName,Long teamId);

  boolean existsByParentTeamTeamIdAndTeamNameIgnoreCaseAndTeamIdNot(Long parentTeamId,
      String teamName,Long teamId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select team from Team team where team.teamId = :teamId")
  Optional<Team> findByIdForUpdate(Long teamId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select team from Team team where team.teamId in :teamIds order by team.teamId asc")
  List<Team> findAllByTeamIdInForUpdateOrderByTeamIdAsc(List<Long> teamIds);

  List<Team> findAllByParentTeamTeamId(Long parentTeamId);

  boolean existsByParentTeamTeamId(Long parentTeamId);

  @Query("select new com.flowbi.domain.team.repository.TeamHierarchyTeamRow(team.teamId, "
      + "team.teamName, parent.teamId) from Team team left join team.parentTeam parent")
  List<TeamHierarchyTeamRow> findAllHierarchyRows();
}
