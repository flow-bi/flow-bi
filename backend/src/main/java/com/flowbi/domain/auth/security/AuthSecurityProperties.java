package com.flowbi.domain.auth.security;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth")
public class AuthSecurityProperties {

  private final Session session = new Session();
  private final Cors cors = new Cors();

  public Session getSession() {
    return session;
  }

  public Cors getCors() {
    return cors;
  }

  public static class Session {

    private Duration absoluteTimeout = Duration.ofHours(10);
    private boolean secureCookie = true;

    public Duration getAbsoluteTimeout() {
      return absoluteTimeout;
    }

    public void setAbsoluteTimeout(Duration absoluteTimeout) {
      this.absoluteTimeout = absoluteTimeout;
    }

    public boolean isSecureCookie() {
      return secureCookie;
    }

    public void setSecureCookie(boolean secureCookie) {
      this.secureCookie = secureCookie;
    }
  }

  public static class Cors {

    private List<String> allowedOrigins = new ArrayList<>();

    public List<String> getAllowedOrigins() {
      return allowedOrigins;
    }

    public void setAllowedOrigins(List<String> allowedOrigins) {
      this.allowedOrigins = allowedOrigins == null ? new ArrayList<>() : allowedOrigins;
    }
  }
}
