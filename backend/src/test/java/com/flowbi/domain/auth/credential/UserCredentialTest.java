package com.flowbi.domain.auth.credential;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.flowbi.domain.user.entity.User;
import org.junit.jupiter.api.Test;

class UserCredentialTest {

  @Test
  void preservesTheCreationFlagAndClearsItWhenThePasswordChanges() {
    UserCredential credential = UserCredential.create(mock(User.class),"temporary-hash",true);

    assertThat(credential.isMustChangePassword()).isTrue();

    credential.changePassword("new-hash");

    assertThat(credential.isMustChangePassword()).isFalse();
  }
}
