package com.flowbi.domain.auth.login;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank @Size(max = 50) @Pattern(regexp = "[A-Za-z0-9-]+") String employeeNumber,
    @NotBlank @Size(min = 10, max = 128) String password) {
}
