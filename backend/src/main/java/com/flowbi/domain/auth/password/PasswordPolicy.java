package com.flowbi.domain.auth.password;

import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class PasswordPolicy {

  private static final Pattern VALID_PASSWORD = Pattern
      .compile("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s])\\S{10,128}$");

  public boolean isValid(String password) {
    return password != null && VALID_PASSWORD.matcher(password).matches();
  }
}
