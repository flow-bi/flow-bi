package com.flowbi.domain.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.flowbi.domain.user.dto.CurrentUserResponse;
import com.flowbi.domain.user.dto.OrganizationChartUserDetailResponse;
import com.flowbi.domain.user.dto.OrganizationChartUserListResponse;
import com.flowbi.domain.user.entity.UserStatus;
import com.flowbi.domain.user.entity.WorkStatus;
import com.flowbi.domain.user.repository.CurrentUserNameProjection;
import com.flowbi.domain.user.repository.OrganizationChartUserDetailProjection;
import com.flowbi.domain.user.repository.OrganizationChartUserListProjection;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.server.ResponseStatusException;

class UserServiceTest {

  private final UserRepository users = Mockito.mock(UserRepository.class);
  private final UserService service = new UserService(users);

  @Test
  void returnsSortedOrganizationChartUsersWithSeparatedAccountAndWorkStatuses() {
    when(users.existsByTeamTeamId(3L)).thenReturn(true);
    when(users.findOrganizationChartUsersByTeamId(3L))
        .thenReturn(java.util.List.of(new OrganizationChartUserListProjection(7L, "Kim Flow",
            "Engineer", UserStatus.INACTIVE, WorkStatus.OUT_OF_OFFICE, null)));

    OrganizationChartUserListResponse response = service.getOrganizationChartUsers(3L).get(0);

    assertThat(response)
        .extracting(OrganizationChartUserListResponse::userId,
            OrganizationChartUserListResponse::name,OrganizationChartUserListResponse::position,
            OrganizationChartUserListResponse::accountStatus,
            OrganizationChartUserListResponse::workStatus)
        .containsExactly(7L,"Kim Flow","Engineer","INACTIVE",WorkStatus.OUT_OF_OFFICE);
    assertThat(OrganizationChartUserListResponse.class.getRecordComponents())
        .extracting(component -> component.getName())
        .containsExactly("userId","name","position","accountStatus","workStatus","profileImageUrl");
  }

  @Test
  void hidesMissingTeamsAndUsersAsNotFound() {
    when(users.existsByTeamTeamId(9L)).thenReturn(false);
    when(users.findOrganizationChartDetailByUserId(9L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getOrganizationChartUsers(9L))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(exception -> ((ResponseStatusException) exception).getStatusCode().value())
        .isEqualTo(404);
    assertThatThrownBy(() -> service.getOrganizationChartUserDetail(9L))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(exception -> ((ResponseStatusException) exception).getStatusCode().value())
        .isEqualTo(404);
  }

  @Test
  void returnsOnlyTheOrganizationChartDetailFieldsForInactiveOrActiveUsers() {
    when(users.findOrganizationChartDetailByUserId(7L)).thenReturn(
        Optional.of(new OrganizationChartUserDetailProjection("https://images.example.test/7",
            "Kim Flow", "Engineer", "Platform", "1234", "kim@example.test", UserStatus.INACTIVE,
            WorkStatus.ON_LEAVE)));

    OrganizationChartUserDetailResponse response = service.getOrganizationChartUserDetail(7L);

    assertThat(response)
        .extracting(OrganizationChartUserDetailResponse::name,
            OrganizationChartUserDetailResponse::accountStatus,
            OrganizationChartUserDetailResponse::workStatus)
        .containsExactly("Kim Flow","INACTIVE",WorkStatus.ON_LEAVE);
    assertThat(OrganizationChartUserDetailResponse.class.getRecordComponents())
        .extracting(component -> component.getName()).containsExactly("profileImageUrl","name",
            "position","team","extensionNumber","email","accountStatus","workStatus");
  }

  @Test
  void returnsOnlyTheActivePrincipalsNameForTheCurrentUserResponse() {
    when(users.findActiveNameByUserId(42L))
        .thenReturn(Optional.of(new CurrentUserNameProjection("Kim Flow")));

    CurrentUserResponse response = service.getCurrentUser(42L);

    assertThat(response.name()).isEqualTo("Kim Flow");
    assertThat(CurrentUserResponse.class.getRecordComponents())
        .extracting(component -> component.getName()).containsExactly("name");
  }

  @Test
  void hidesMissingOrInactiveCurrentUsersAsNotFound() {
    when(users.findActiveNameByUserId(42L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getCurrentUser(42L))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(exception -> ((ResponseStatusException) exception).getStatusCode().value())
        .isEqualTo(404);
  }
}
