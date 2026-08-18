package com.flowbi.domain.user.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.team.entity.Team;
import java.time.Instant;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class UserTest {

  private static final Position POSITION = Position.create("Engineer");
  private static final Team TEAM = Team.create("Platform");

  @Test
  void createsAnActiveUserWithNormalizedRequiredValuesAtMaximumLengths() {
    User user = User.create(" " + "E".repeat(50) + " "," " + "a".repeat(243) + "@example.com ",
        " " + "N".repeat(50) + " ",POSITION,TEAM);

    assertThat(user.getEmployeeNumber()).isEqualTo("E".repeat(50));
    assertThat(user.getEmail()).isEqualTo("a".repeat(243) + "@example.com");
    assertThat(user.getName()).isEqualTo("N".repeat(50));
    assertThat(user.getPosition()).isSameAs(POSITION);
    assertThat(user.getTeam()).isSameAs(TEAM);
    assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
  }

  @Test
  void rejectsInvalidRequiredValuesAndControlCharacters() {
    assertThatIllegalArgumentException()
        .isThrownBy(() -> User.create(null,"a@example.com","Name",POSITION,TEAM));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> User.create(" ","a@example.com","Name",POSITION,TEAM));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> User.create("E".repeat(51),"a@example.com","Name",POSITION,TEAM));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> User.create("E1","invalid-email","Name",POSITION,TEAM));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> User.create("E1","a@example.com"," ",POSITION,TEAM));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> User.create("E1","a@example.com","N".repeat(51),POSITION,TEAM));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> User.create("E\n1","a@example.com","Name",POSITION,TEAM));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> User.create("E1","a@example.com","Name\u0000",POSITION,TEAM));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> User.create("E1","a@example.com","Name",null,TEAM));
    assertThatIllegalArgumentException()
        .isThrownBy(() -> User.create("E1","a@example.com","Name",POSITION,null));
  }

  @Test
  void normalizesBlankPhoneNumberAndAcceptsUndecidedPhoneFormatsWithinLength() {
    User user = user();

    user.changePhoneNumber("   ");
    assertThat(user.getPhoneNumber()).isNull();

    user.changePhoneNumber(" 02-1234 ext.5 ");
    assertThat(user.getPhoneNumber()).isEqualTo("02-1234 ext.5");
    assertThatIllegalArgumentException().isThrownBy(() -> user.changePhoneNumber("1".repeat(21)));
  }

  @Test
  void transitionsOnlyBetweenActiveAndInactiveAccountStates() {
    User user = user();

    user.deactivate();
    assertThat(user.getStatus()).isEqualTo(UserStatus.INACTIVE);
    user.activate();
    assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
    assertThat(Arrays.stream(UserStatus.values())).containsExactly(UserStatus.ACTIVE,
        UserStatus.INACTIVE);
  }

  @Test
  void validatesChangesBeforeMutatingExistingValuesAndExposesNoNameOrEmployeeNumberMutator() {
    User user = user();
    String email = user.getEmail();
    Team team = user.getTeam();
    Position position = user.getPosition();

    assertThatIllegalArgumentException().isThrownBy(() -> user.changeEmail("invalid"));
    assertThat(user.getEmail()).isEqualTo(email);
    assertThatIllegalArgumentException().isThrownBy(() -> user.changeTeam(null));
    assertThat(user.getTeam()).isSameAs(team);
    assertThatIllegalArgumentException().isThrownBy(() -> user.changePosition(null));
    assertThat(user.getPosition()).isSameAs(position);
    assertThat(User.class.getMethods()).extracting(method -> method.getName()).doesNotContain(
        "setName","setEmployeeNumber","setStatus","changeName","changeEmployeeNumber");
  }

  @Test
  void maintainsAbsoluteAuditInstantsWithoutOverwritingCreationOrRegressingUpdates() {
    User user = user();

    user.onCreate();
    Instant createdAt = user.getCreatedAt();
    Instant updatedAt = user.getUpdatedAt();
    user.onCreate();
    user.onUpdate();

    assertThat(user.getCreatedAt()).isEqualTo(createdAt);
    assertThat(user.getUpdatedAt()).isAfterOrEqualTo(updatedAt);
  }

  private static User user() {
    return User.create("E100","user@example.com","User",POSITION,TEAM);
  }
}
