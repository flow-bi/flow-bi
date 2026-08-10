package com.flowbi.domain.auth.fixture;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth.test-fixtures")
public class TestFixtureProperties {

  private boolean enabled;
  private Account normal = new Account();
  private Account passwordChangeRequired = new Account();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Account getNormal() {
    return normal;
  }

  public void setNormal(Account normal) {
    this.normal = normal;
  }

  public Account getPasswordChangeRequired() {
    return passwordChangeRequired;
  }

  public void setPasswordChangeRequired(Account passwordChangeRequired) {
    this.passwordChangeRequired = passwordChangeRequired;
  }

  public static class Account {
    private String employeeNumber;
    private String password;

    public String getEmployeeNumber() {
      return employeeNumber;
    }

    public void setEmployeeNumber(String employeeNumber) {
      this.employeeNumber = employeeNumber;
    }

    public String getPassword() {
      return password;
    }

    public void setPassword(String password) {
      this.password = password;
    }
  }
}
