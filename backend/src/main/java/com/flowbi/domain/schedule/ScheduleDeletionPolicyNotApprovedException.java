package com.flowbi.domain.schedule;

public final class ScheduleDeletionPolicyNotApprovedException extends RuntimeException {
  public ScheduleDeletionPolicyNotApprovedException() {
    super("Schedule deletion is unavailable until a retention policy is approved");
  }
}
