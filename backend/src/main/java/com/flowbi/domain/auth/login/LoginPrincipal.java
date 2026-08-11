package com.flowbi.domain.auth.login;

import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public record LoginPrincipal(String userId, boolean mustChangePassword) implements UserDetails {
  @Override
  public List<? extends GrantedAuthority> getAuthorities() {
    return List.of(new SimpleGrantedAuthority("ROLE_USER"));
  }
  @Override
  public String getPassword() {
    return "";
  }
  @Override
  public String getUsername() {
    return userId;
  }
}
