package com.flowbi.domain.team.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.team.dto.TeamHierarchyResponse;
import com.flowbi.domain.team.dto.TeamPathResponse;
import com.flowbi.domain.team.dto.TeamRelationResponse;
import com.flowbi.domain.team.repository.TeamClosureRepository;
import com.flowbi.domain.team.repository.TeamHierarchyClosureRow;
import com.flowbi.domain.team.repository.TeamHierarchyTeamRow;
import com.flowbi.domain.team.repository.TeamRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TeamHierarchyQueryServiceTest {

  @Mock
  private TeamRepository teams;

  @Mock
  private TeamClosureRepository closures;

  @InjectMocks
  private TeamHierarchyService service;

  @Test
  void returnsDirectAndClosureRelationsWithStableOrdering() {
    fixture();

    assertThat(service.findParent(3L)).contains(new TeamRelationResponse(2L, "Development", 1));
    assertThat(service.findChildren(1L)).containsExactly(
        new TeamRelationResponse(2L, "Development", 1),new TeamRelationResponse(4L, "People", 1));
    assertThat(service.findAncestors(3L)).containsExactly(
        new TeamRelationResponse(2L, "Development", 1),
        new TeamRelationResponse(1L, "Headquarters", 2));
    assertThat(service.findDescendants(1L)).containsExactly(
        new TeamRelationResponse(2L, "Development", 1),new TeamRelationResponse(4L, "People", 1),
        new TeamRelationResponse(3L, "Backend", 2));
  }

  @Test
  void returnsTopDownPathAndRelativeSubtreeDepth() {
    fixture();

    assertThat(service.findPath(3L)).containsExactly(new TeamPathResponse(1L, "Headquarters", 0),
        new TeamPathResponse(2L, "Development", 1),new TeamPathResponse(3L, "Backend", 2));
    assertThat(service.findSubtree(2L)).isEqualTo(new TeamHierarchyResponse(2L, "Development", 0,
        List.of(new TeamHierarchyResponse(3L, "Backend", 1, List.of()))));
  }

  @Test
  void returnsEveryRootAndSiblingInDeterministicNameThenIdOrder() {
    fixture();

    assertThat(service.findOrganizationTree()).containsExactly(
        new TeamHierarchyResponse(1L, "Headquarters", 0,
            List.of(
                new TeamHierarchyResponse(2L, "Development", 1,
                    List.of(new TeamHierarchyResponse(3L, "Backend", 2, List.of()))),
                new TeamHierarchyResponse(4L, "People", 1, List.of()))),
        new TeamHierarchyResponse(5L, "Sales", 0, List.of()));
  }

  @Test
  void returnsAnEmptyOrganizationTreeWhenThereAreNoTeams() {
    when(teams.findAllHierarchyRows()).thenReturn(List.of());
    when(closures.findAllHierarchyRows()).thenReturn(List.of());

    assertThat(service.findOrganizationTree()).isEmpty();
  }

  @Test
  void returnsEmptyResultsForMissingRelationsAndUsesAtMostTwoBatchQueries() {
    fixture();

    assertThat(service.findParent(1L)).isEmpty();
    assertThat(service.findChildren(3L)).isEmpty();
    assertThat(service.findAncestors(1L)).isEmpty();
    assertThat(service.findDescendants(3L)).isEmpty();

    verify(teams,times(4)).findAllHierarchyRows();
    verify(closures,times(4)).findAllHierarchyRows();
  }

  @Test
  void completesPathSubtreeAndOrganizationTreeWithTwoBatchQueriesEach() {
    fixture();

    service.findPath(3L);
    service.findSubtree(2L);
    service.findOrganizationTree();

    verify(teams,times(3)).findAllHierarchyRows();
    verify(closures,times(3)).findAllHierarchyRows();
  }

  @Test
  void rejectsMissingOrInconsistentClosureData() {
    when(teams.findAllHierarchyRows())
        .thenReturn(List.of(new TeamHierarchyTeamRow(1L, "Headquarters", null),
            new TeamHierarchyTeamRow(2L, "Development", 1L)));
    when(closures.findAllHierarchyRows()).thenReturn(
        List.of(new TeamHierarchyClosureRow(1L, 1L, 0),new TeamHierarchyClosureRow(2L, 2L, 0)));

    assertThatThrownBy(() -> service.findSubtree(1L))
        .isInstanceOf(TeamHierarchyInconsistentException.class);
  }

  @Test
  void rejectsDuplicateClosureRowsAndAdjacencyDepthOneMismatch() {
    when(teams.findAllHierarchyRows())
        .thenReturn(List.of(new TeamHierarchyTeamRow(1L, "Headquarters", null),
            new TeamHierarchyTeamRow(2L, "Development", 1L)));
    when(closures.findAllHierarchyRows()).thenReturn(
        List.of(new TeamHierarchyClosureRow(1L, 1L, 0),new TeamHierarchyClosureRow(2L, 2L, 0),
            new TeamHierarchyClosureRow(1L, 2L, 1),new TeamHierarchyClosureRow(1L, 2L, 1)));

    assertThatThrownBy(() -> service.findSubtree(1L))
        .isInstanceOf(TeamHierarchyInconsistentException.class);

    when(closures.findAllHierarchyRows()).thenReturn(List.of(new TeamHierarchyClosureRow(1L, 1L, 0),
        new TeamHierarchyClosureRow(2L, 2L, 0),new TeamHierarchyClosureRow(1L, 2L, 2)));

    assertThatThrownBy(() -> service.findSubtree(1L))
        .isInstanceOf(TeamHierarchyInconsistentException.class);
  }

  @Test
  void breaksEqualNameTiesWithTeamIdForRootsAndChildren() {
    when(teams.findAllHierarchyRows()).thenReturn(
        List.of(new TeamHierarchyTeamRow(4L, "Same", 1L),new TeamHierarchyTeamRow(3L, "Same", 1L),
            new TeamHierarchyTeamRow(2L, "Same", null),new TeamHierarchyTeamRow(1L, "Same", null)));
    when(closures.findAllHierarchyRows()).thenReturn(
        List.of(new TeamHierarchyClosureRow(1L, 1L, 0),new TeamHierarchyClosureRow(2L, 2L, 0),
            new TeamHierarchyClosureRow(3L, 3L, 0),new TeamHierarchyClosureRow(4L, 4L, 0),
            new TeamHierarchyClosureRow(1L, 3L, 1),new TeamHierarchyClosureRow(1L, 4L, 1)));

    assertThat(service.findOrganizationTree()).containsExactly(
        new TeamHierarchyResponse(1L, "Same", 0,
            List.of(new TeamHierarchyResponse(3L, "Same", 1, List.of()),
                new TeamHierarchyResponse(4L, "Same", 1, List.of()))),
        new TeamHierarchyResponse(2L, "Same", 0, List.of()));
  }

  private void fixture() {
    when(teams.findAllHierarchyRows()).thenReturn(List.of(
        new TeamHierarchyTeamRow(3L, "Backend", 2L),new TeamHierarchyTeamRow(5L, "Sales", null),
        new TeamHierarchyTeamRow(4L, "People", 1L),new TeamHierarchyTeamRow(2L, "Development", 1L),
        new TeamHierarchyTeamRow(1L, "Headquarters", null)));
    when(closures.findAllHierarchyRows()).thenReturn(List.of(new TeamHierarchyClosureRow(1L, 3L, 2),
        new TeamHierarchyClosureRow(1L, 1L, 0),new TeamHierarchyClosureRow(3L, 3L, 0),
        new TeamHierarchyClosureRow(2L, 3L, 1),new TeamHierarchyClosureRow(1L, 4L, 1),
        new TeamHierarchyClosureRow(4L, 4L, 0),new TeamHierarchyClosureRow(1L, 2L, 1),
        new TeamHierarchyClosureRow(2L, 2L, 0),new TeamHierarchyClosureRow(5L, 5L, 0)));
  }
}
