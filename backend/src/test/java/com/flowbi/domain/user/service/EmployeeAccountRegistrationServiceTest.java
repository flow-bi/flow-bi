package com.flowbi.domain.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.flowbi.domain.auth.service.PasswordPolicy;
import com.flowbi.domain.auth.entity.UserCredential;
import com.flowbi.domain.auth.repository.UserCredentialRepository;
import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.service.PositionService;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.service.TeamService;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

class EmployeeAccountRegistrationServiceTest {

  @Test
  void registersAnActiveUserWithAnEncodedCredentialThatMustBeChanged() {
    UserRepository users = mock(UserRepository.class);
    TeamService teams = mock(TeamService.class);
    PositionService positions = mock(PositionService.class);
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    Team team = Team.create("People");
    Position position = Position.create("Manager");
    User saved = User.create("E100","Kim",position,team);
    when(teams.findExisting(1L)).thenReturn(team);
    when(positions.findExisting(2L)).thenReturn(position);
    when(users.findByEmployeeNumber("E100")).thenReturn(Optional.empty());
    when(users.save(any(User.class))).thenReturn(saved);
    when(encoder.encode("Password1!")).thenReturn("hash");
    EmployeeAccountRegistrationService service = new EmployeeAccountRegistrationService(users,
        teams, positions, credentials, encoder, new PasswordPolicy());

    EmployeeAccountRegistration registration = service.register(
        new EmployeeAccountRegistrationRequest("E100", "Kim", 1L, 2L, "Password1!", "Password1!"));

    assertThat(registration.user()).isSameAs(saved);
    assertThat(registration.mustChangePassword()).isTrue();
    ArgumentCaptor<UserCredential> credential = ArgumentCaptor.forClass(UserCredential.class);
    verify(credentials).save(credential.capture());
    assertThat(credential.getValue().isMustChangePassword()).isTrue();
    assertThat(credential.getValue().getPasswordHash()).isEqualTo("hash");
  }

  @Test
  void rejectsDuplicateAndInvalidPasswordBeforePersistingAUser() {
    UserRepository users = mock(UserRepository.class);
    TeamService teams = mock(TeamService.class);
    PositionService positions = mock(PositionService.class);
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    when(users.findByEmployeeNumber("E100")).thenReturn(Optional.of(mock(User.class)));
    EmployeeAccountRegistrationService service = new EmployeeAccountRegistrationService(users,
        teams, positions, credentials, encoder, new PasswordPolicy());

    assertThatThrownBy(() -> service.register(
        new EmployeeAccountRegistrationRequest("E100", "Kim", 1L, 2L, "Password1!", "Password1!")))
        .isInstanceOf(EmployeeAccountRegistrationException.class);
    assertThatThrownBy(() -> service.register(
        new EmployeeAccountRegistrationRequest("E101", "Kim", 1L, 2L, "invalid", "different")))
        .isInstanceOf(EmployeeAccountRegistrationException.class);
    verifyNoInteractions(teams,positions,credentials);
  }

  @Test
  void propagatesCredentialPersistenceFailureSoTheTransactionCanRollBack() {
    UserRepository users = mock(UserRepository.class);
    TeamService teams = mock(TeamService.class);
    PositionService positions = mock(PositionService.class);
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    Team team = Team.create("People");
    Position position = Position.create("Manager");
    User saved = User.create("E100","Kim",position,team);
    when(teams.findExisting(1L)).thenReturn(team);
    when(positions.findExisting(2L)).thenReturn(position);
    when(users.findByEmployeeNumber("E100")).thenReturn(Optional.empty());
    when(users.save(any(User.class))).thenReturn(saved);
    when(encoder.encode("Password1!")).thenReturn("hash");
    when(credentials.save(any(UserCredential.class)))
        .thenThrow(new DataIntegrityViolationException("credential failure"));
    EmployeeAccountRegistrationService service = new EmployeeAccountRegistrationService(users,
        teams, positions, credentials, encoder, new PasswordPolicy());

    assertThatThrownBy(() -> service.register(
        new EmployeeAccountRegistrationRequest("E100", "Kim", 1L, 2L, "Password1!", "Password1!")))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void rejectsMissingOrganizationReferencesAndPasswordPolicyViolationsBeforeCreatingAnAccount() {
    UserRepository users = mock(UserRepository.class);
    TeamService teams = mock(TeamService.class);
    PositionService positions = mock(PositionService.class);
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    when(users.findByEmployeeNumber("E100")).thenReturn(Optional.empty());
    when(teams.findExisting(1L))
        .thenThrow(new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND));
    EmployeeAccountRegistrationService service = new EmployeeAccountRegistrationService(users,
        teams, positions, credentials, encoder, new PasswordPolicy());

    assertThatThrownBy(() -> service.register(new EmployeeAccountRegistrationRequest("E100", "Kim",
        1L, 2L, "Password123!", "Password123!")))
        .isInstanceOf(EmployeeAccountRegistrationException.class);
    assertThatThrownBy(() -> service
        .register(new EmployeeAccountRegistrationRequest("E101", "Kim", 1L, 2L, "short", "short")))
        .isInstanceOf(EmployeeAccountRegistrationException.class);
    verify(users,never()).save(any(User.class));
    verifyNoInteractions(credentials,encoder);
  }

  @Test
  void createsSyntheticFixturesThroughTheSameRegistrationServiceWhileKeepingTheirFixedState() {
    UserRepository users = mock(UserRepository.class);
    TeamService teams = mock(TeamService.class);
    PositionService positions = mock(PositionService.class);
    UserCredentialRepository credentials = mock(UserCredentialRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    Team team = Team.create("People");
    Position position = Position.create("Manager");
    User saved = User.create("fixture-normal","Synthetic Fixture",position,team);
    when(teams.findExisting(1L)).thenReturn(team);
    when(positions.findExisting(2L)).thenReturn(position);
    when(users.findByEmployeeNumber("fixture-normal")).thenReturn(Optional.empty());
    when(users.save(any(User.class))).thenReturn(saved);
    when(encoder.encode("Password1!")).thenReturn("hash");
    EmployeeAccountRegistrationService service = new EmployeeAccountRegistrationService(users,
        teams, positions, credentials, encoder, new PasswordPolicy());

    EmployeeAccountRegistration registration = service
        .registerFixture(new EmployeeAccountRegistrationRequest("fixture-normal",
            "Synthetic Fixture", 1L, 2L, "Password1!", "Password1!"),false);

    assertThat(registration.user()).isSameAs(saved);
    assertThat(registration.mustChangePassword()).isFalse();
    verify(credentials).save(any(UserCredential.class));
  }
}
