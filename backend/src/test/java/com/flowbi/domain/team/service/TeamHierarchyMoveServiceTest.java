package com.flowbi.domain.team.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.team.dto.TeamMoveRequest;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TeamHierarchyMoveServiceTest {

  @Mock
  private TeamRepository teams;

  @Mock
  private TeamClosureRepository closures;

  @Mock
  private TeamHierarchyService hierarchyService;

  @InjectMocks
  private TeamHierarchyMoveService service;

  @Test
  void movesTheCompleteSubtreeAndPreservesItsInternalClosure() {
    Team root = team(1L,"Company",null);
    Team moving = team(2L,"Development",root);
    Team child = team(3L,"Backend",moving);
    Team newParent = team(4L,"Platform",root);
    when(closures.findDescendantTeamIds(2L)).thenReturn(List.of(2L,3L));
    when(teams.findAllByTeamIdInForUpdateOrderByTeamIdAsc(List.of(2L,3L,4L)))
        .thenReturn(List.of(moving,child,newParent));
    when(closures.findDescendantTeamIds(2L)).thenReturn(List.of(2L,3L));
    when(closures.findAncestorTeamIds(4L)).thenReturn(List.of(1L,4L));

    service.move(2L,new TeamMoveRequest(4L));

    assertThat(moving.getParentTeam()).isSameAs(newParent);
    verify(closures).findAncestorTeamIds(4L);
    verify(closures).deleteExternalAncestorRelationships(2L);
    verify(closures).insertExternalAncestorRelationships(2L,4L);
  }

  @Test
  void movesChildToRootByRemovingOnlyExternalAncestors() {
    Team root = team(1L,"Company",null);
    Team moving = team(2L,"Development",root);
    when(closures.findDescendantTeamIds(2L)).thenReturn(List.of(2L));
    when(teams.findAllByTeamIdInForUpdateOrderByTeamIdAsc(List.of(2L))).thenReturn(List.of(moving));

    service.move(2L,new TeamMoveRequest(null));

    assertThat(moving.getParentTeam()).isNull();
    verify(closures).deleteExternalAncestorRelationships(2L);
  }

  @Test
  void rejectsSelfDescendantAndUnchangedParentMoves() {
    Team root = team(1L,"Company",null);
    Team moving = team(2L,"Development",root);
    Team child = team(3L,"Backend",moving);
    when(closures.findDescendantTeamIds(2L)).thenReturn(List.of(2L,3L));
    when(teams.findAllByTeamIdInForUpdateOrderByTeamIdAsc(anyList()))
        .thenReturn(List.of(root,moving,child));
    when(closures.findAncestorTeamIds(3L)).thenReturn(List.of(1L,2L,3L));

    assertThatThrownBy(() -> service.move(2L,new TeamMoveRequest(2L)))
        .isInstanceOf(TeamHierarchyMoveConflictException.class);
    assertThatThrownBy(() -> service.move(2L,new TeamMoveRequest(3L)))
        .isInstanceOf(TeamHierarchyMoveConflictException.class);
    assertThatThrownBy(() -> service.move(2L,new TeamMoveRequest(1L)))
        .isInstanceOf(TeamHierarchyMoveConflictException.class);
  }

  @Test
  void rejectsAnUnknownNewParent() {
    when(closures.findDescendantTeamIds(2L)).thenReturn(List.of(2L));
    when(teams.findAllByTeamIdInForUpdateOrderByTeamIdAsc(List.of(2L,99L)))
        .thenReturn(List.of(team(2L,"Development",null)));

    assertThatThrownBy(() -> service.move(2L,new TeamMoveRequest(99L)))
        .isInstanceOf(TeamNotFoundException.class);
  }

  private static Team team(Long id,String name,Team parent) {
    Team team = Team.create(name,parent);
    ReflectionTestUtils.setField(team,"teamId",id);
    return team;
  }
}
