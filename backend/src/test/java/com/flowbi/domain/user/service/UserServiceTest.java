package com.flowbi.domain.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.flowbi.domain.user.dto.UserDetailResponse;
import com.flowbi.domain.user.repository.UserDetailProjection;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.server.ResponseStatusException;

class UserServiceTest {

  private final UserRepository users = Mockito.mock(UserRepository.class);
  private final UserService service = new UserService(users);

  @Test
  void returnsOnlyTheMinimumActiveUserDetailWithTeamAndPosition() {
    when(users.findActiveDetailByUserId(7L)).thenReturn(Optional
        .of(new UserDetailProjection(7L, "Kim Flow", "ACTIVE", 3L, "Platform", 2L, "Engineer")));

    UserDetailResponse response = service.getUserDetail(7L);

    assertThat(response)
        .extracting(UserDetailResponse::userId,UserDetailResponse::name,UserDetailResponse::status)
        .containsExactly(7L,"Kim Flow","ACTIVE");
    assertThat(response.team())
        .extracting(UserDetailResponse.TeamDetail::teamId,UserDetailResponse.TeamDetail::name)
        .containsExactly(3L,"Platform");
    assertThat(response.position()).extracting(UserDetailResponse.PositionDetail::positionId,
        UserDetailResponse.PositionDetail::name).containsExactly(2L,"Engineer");
    assertThat(UserDetailResponse.class.getRecordComponents())
        .extracting(component -> component.getName())
        .containsExactly("userId","name","status","team","position");
  }

  @Test
  void hidesMissingOrInactiveUsersAsNotFound() {
    when(users.findActiveDetailByUserId(9L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getUserDetail(9L)).isInstanceOf(ResponseStatusException.class)
        .extracting(exception -> ((ResponseStatusException) exception).getStatusCode().value())
        .isEqualTo(404);
  }
}
