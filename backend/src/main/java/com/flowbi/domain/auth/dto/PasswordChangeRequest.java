package com.flowbi.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(@NotBlank @Size(max = 128) String newPassword,
    @NotBlank @Size(max = 128) String confirmation) {
}
