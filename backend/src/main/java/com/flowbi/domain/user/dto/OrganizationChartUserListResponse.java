package com.flowbi.domain.user.dto;

import com.flowbi.domain.user.entity.WorkStatus;

public record OrganizationChartUserListResponse(Long userId, String name, String position,
    String accountStatus, WorkStatus workStatus, String profileImageUrl) {
}
