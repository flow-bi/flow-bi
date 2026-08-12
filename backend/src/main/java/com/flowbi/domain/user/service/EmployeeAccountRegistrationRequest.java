package com.flowbi.domain.user.service;

public record EmployeeAccountRegistrationRequest(String employeeNumber, String name, Long teamId,
    Long positionId, String initialPassword, String confirmation) {
}
