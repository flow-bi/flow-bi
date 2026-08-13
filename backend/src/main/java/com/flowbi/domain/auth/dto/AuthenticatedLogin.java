package com.flowbi.domain.auth.dto;

public record AuthenticatedLogin(String userId, boolean mustChangePassword, long generation) {
}
