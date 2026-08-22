package com.flowbi.domain.team.repository;

import com.flowbi.domain.team.entity.TeamClosure;
import com.flowbi.domain.team.entity.TeamClosureId;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TeamClosureRepository extends JpaRepository<TeamClosure, TeamClosureId> {

  List<TeamClosure> findAllByDescendantTeamTeamIdOrderByDepthAsc(Long descendantTeamId);

  List<TeamClosure> findAllByAncestorTeamTeamIdOrderByDepthAsc(Long ancestorTeamId);

  @Query(value = "select descendant_team_id from teams_closure where ancestor_team_id = :teamId "
      + "order by descendant_team_id asc", nativeQuery = true)
  List<Long> findDescendantTeamIds(Long teamId);

  @Query(value = "select ancestor_team_id from teams_closure where descendant_team_id = :teamId "
      + "order by ancestor_team_id asc", nativeQuery = true)
  List<Long> findAncestorTeamIds(Long teamId);

  @Modifying(flushAutomatically = true)
  @Query(value = "delete from teams_closure where descendant_team_id in (select "
      + "descendant_team_id from teams_closure where ancestor_team_id = :rootTeamId) "
      + "and ancestor_team_id not in (select descendant_team_id from teams_closure "
      + "where ancestor_team_id = :rootTeamId)", nativeQuery = true)
  int deleteExternalAncestorRelationships(Long rootTeamId);

  @Modifying(flushAutomatically = true)
  @Query(value = "insert into teams_closure (ancestor_team_id, descendant_team_id, depth, "
      + "created_at, updated_at) select new_ancestor.ancestor_team_id, "
      + "subtree.descendant_team_id, new_ancestor.depth + 1 + subtree.depth, current_timestamp, "
      + "current_timestamp from teams_closure new_ancestor cross join teams_closure subtree "
      + "where new_ancestor.descendant_team_id = :newParentTeamId and subtree.ancestor_team_id "
      + "= :rootTeamId", nativeQuery = true)
  int insertExternalAncestorRelationships(Long rootTeamId,Long newParentTeamId);

  @Modifying(flushAutomatically = true)
  @Query(value = "delete from teams_closure where ancestor_team_id = :teamId "
      + "or descendant_team_id = :teamId", nativeQuery = true)
  int deleteRelationshipsForTeam(Long teamId);

  @Query("select new com.flowbi.domain.team.repository.TeamHierarchyClosureRow("
      + "closure.ancestorTeam.teamId, closure.descendantTeam.teamId, closure.depth) "
      + "from TeamClosure closure")
  List<TeamHierarchyClosureRow> findAllHierarchyRows();
}
