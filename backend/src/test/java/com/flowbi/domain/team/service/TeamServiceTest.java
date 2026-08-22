package com.flowbi.domain.team.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.team.dto.TeamCreateRequest;
import com.flowbi.domain.team.dto.TeamNameUpdateRequest;
import com.flowbi.domain.team.dto.TeamValidationException;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.entity.TeamClosure;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

  @Mock
  private TeamRepository teams;

  @Mock
  private TeamClosureRepository closures;

  @InjectMocks
  private TeamService service;

  @Test
  void createsRootWithItsSelfClosure() {
    Team saved = Team.create("Company");
    when(teams.existsByParentTeamIsNullAndTeamNameIgnoreCase("Company")).thenReturn(false);
    when(teams.saveAndFlush(any(Team.class))).thenReturn(saved);

    service.create(new TeamCreateRequest(" Company ", null));

    ArgumentCaptor<List<TeamClosure>> captor = ArgumentCaptor.forClass(List.class);
    verify(closures).saveAll(captor.capture());
    assertThat(captor.getValue()).singleElement().satisfies(closure -> {
      assertThat(closure.getAncestorTeam()).isSameAs(saved);
      assertThat(closure.getDescendantTeam()).isSameAs(saved);
      assertThat(closure.getDepth()).isZero();
    });
  }

  @Test
  void createsChildWithSelfAndEveryAncestorClosure() {
    Team parent = Team.create("Engineering");
    Team root = Team.create("Company");
    Team saved = Team.create("Platform",parent);
    ReflectionTestUtils.setField(parent,"teamId",10L);
    ReflectionTestUtils.setField(root,"teamId",1L);
    ReflectionTestUtils.setField(saved,"teamId",11L);
    when(teams.findByIdForUpdate(10L)).thenReturn(Optional.of(parent));
    when(teams.existsByParentTeamTeamIdAndTeamNameIgnoreCase(10L,"Platform")).thenReturn(false);
    when(teams.saveAndFlush(any(Team.class))).thenReturn(saved);
    when(closures.findAllByDescendantTeamTeamIdOrderByDepthAsc(10L))
        .thenReturn(List.of(TeamClosure.create(parent,parent,0),TeamClosure.create(root,parent,1)));

    service.create(new TeamCreateRequest("Platform", 10L));

    ArgumentCaptor<List<TeamClosure>> captor = ArgumentCaptor.forClass(List.class);
    verify(closures).saveAll(captor.capture());
    assertThat(captor.getValue()).extracting(TeamClosure::getDepth).containsExactlyInAnyOrder(0,1,
        2);
    assertThat(saved.getParentTeam()).isSameAs(parent);
  }

  @Test
  void rejectsSameParentNameAndUnknownParentWithDomainExceptions() {
    when(teams.existsByParentTeamIsNullAndTeamNameIgnoreCase("Company")).thenReturn(true);
    when(teams.findByIdForUpdate(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.create(new TeamCreateRequest("Company", null)))
        .isInstanceOf(TeamNameConflictException.class);
    assertThatThrownBy(() -> service.create(new TeamCreateRequest("Platform", 99L)))
        .isInstanceOf(TeamNotFoundException.class);
  }

  @Test
  void changesNameAfterCheckingSameParentScope() {
    Team team = Team.create("Old name");
    when(teams.findById(5L)).thenReturn(Optional.of(team));
    when(teams.existsByParentTeamIsNullAndTeamNameIgnoreCaseAndTeamIdNot("New name",5L))
        .thenReturn(false);

    service.updateName(5L,new TeamNameUpdateRequest(" New name "));

    assertThat(team.getTeamName()).isEqualTo("New name");
  }

  @Test
  void findsAnExistingRootUsingTheNormalizedName() {
    Team root = Team.create("Company");
    when(teams.findByTeamNameIgnoreCaseAndParentTeamIsNull("Company"))
        .thenReturn(Optional.of(root));

    Team result = service.findOrCreate(" Company ");

    assertThat(result).isSameAs(root);
    verify(teams).findByTeamNameIgnoreCaseAndParentTeamIsNull("Company");
    verify(teams,org.mockito.Mockito.never()).saveAndFlush(any(Team.class));
  }

  @Test
  void findsAnExistingRootWithoutCaseSensitiveDuplicateCreation() {
    Team root = Team.create("Company");
    when(teams.findByTeamNameIgnoreCaseAndParentTeamIsNull("company"))
        .thenReturn(Optional.of(root));

    Team result = service.findOrCreate("company");

    assertThat(result).isSameAs(root);
    verify(teams).findByTeamNameIgnoreCaseAndParentTeamIsNull("company");
    verify(teams,org.mockito.Mockito.never()).saveAndFlush(any(Team.class));
  }

  @Test
  void rejectsControlCharactersWithAStableValidationException() {
    assertThatThrownBy(() -> new TeamCreateRequest("Platform\nTeam", null))
        .isInstanceOf(TeamValidationException.class);
    assertThatThrownBy(() -> new TeamNameUpdateRequest("\t"))
        .isInstanceOf(TeamValidationException.class);
  }
}
