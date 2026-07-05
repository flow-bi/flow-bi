package com.flowbi.common.security;

public record JwtClaims(Long userId, String employeeNumber, JwtTokenType tokenType) {
}
