package com.flowbi.domain.team.dto;

public final class TeamNameValidator {
  private TeamNameValidator() {
  }

  public static String normalize(String name) {
    if (name == null) {
      throw new TeamValidationException("teamName is required");
    }
    String normalized = name.strip();
    if (normalized.isEmpty() || normalized.length() > 50
        || normalized.codePoints().anyMatch(Character::isISOControl)) {
      throw new TeamValidationException("teamName must be 1 to 50 non-control characters");
    }
    return normalized;
  }
}
