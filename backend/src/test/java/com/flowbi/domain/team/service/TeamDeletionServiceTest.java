package com.flowbi.domain.team.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TeamDeletionServiceTest {

  @Mock
  private TeamRepository teams;

  @Mock
  private TeamClosureRepository closures;

  @InjectMocks
  private TeamDeletionService service;

  @Test
  void deletesALeafOnlyAfterRemovingItsClosureRelationships() {
    Team team = team(7L,"Backend");
    when(teams.findByIdForUpdate(7L)).thenReturn(Optional.of(team));
    when(teams.existsByParentTeamTeamId(7L)).thenReturn(false);

    service.delete(7L);

    verify(closures).deleteRelationshipsForTeam(7L);
    verify(teams).delete(team);
    verify(teams).flush();
  }

  @Test
  void rejectsDeletionWhenTheTeamHasDirectChildrenWithoutChangingClosure() {
    when(teams.findByIdForUpdate(7L)).thenReturn(Optional.of(team(7L,"Development")));
    when(teams.existsByParentTeamTeamId(7L)).thenReturn(true);

    assertThatThrownBy(() -> service.delete(7L)).isInstanceOf(TeamHasChildrenException.class);

    verify(closures,never()).deleteRelationshipsForTeam(7L);
    verify(teams,never()).delete(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void rejectsUnknownTeamsBeforeAnyDeletion() {
    when(teams.findByIdForUpdate(404L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.delete(404L)).isInstanceOf(TeamNotFoundException.class);

    verify(closures,never()).deleteRelationshipsForTeam(404L);
  }

  @Test
  void translatesEmployeeForeignKeyFailuresToTheDomainException() {
    Team team = team(7L,"Backend");
    when(teams.findByIdForUpdate(7L)).thenReturn(Optional.of(team));
    when(teams.existsByParentTeamTeamId(7L)).thenReturn(false);
    org.mockito.Mockito.doThrow(new DataIntegrityViolationException("users-team-fk")).when(teams)
        .flush();

    assertThatThrownBy(() -> service.delete(7L)).isInstanceOf(TeamInUseException.class);
  }

  @Test
  void propagatesIntermediateClosureFailuresForTransactionalRollback() {
    Team team = team(7L,"Backend");
    when(teams.findByIdForUpdate(7L)).thenReturn(Optional.of(team));
    when(teams.existsByParentTeamTeamId(7L)).thenReturn(false);
    org.mockito.Mockito.doThrow(new IllegalStateException("closure failure")).when(closures)
        .deleteRelationshipsForTeam(7L);

    assertThatThrownBy(() -> service.delete(7L)).isInstanceOf(IllegalStateException.class);

    verify(teams,never()).delete(team);
  }

  private static Team team(Long id,String name) {
    Team team = Team.create(name);
    ReflectionTestUtils.setField(team,"teamId",id);
    return team;
  }
}
