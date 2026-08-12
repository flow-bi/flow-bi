package com.flowbi.domain.user.service;

import com.flowbi.domain.user.entity.User;

public record EmployeeAccountRegistration(User user, boolean mustChangePassword) {
}
