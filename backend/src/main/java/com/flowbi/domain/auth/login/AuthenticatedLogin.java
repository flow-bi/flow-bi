package com.flowbi.domain.auth.login;

public record AuthenticatedLogin(String userId, boolean mustChangePassword, long generation) {
}
