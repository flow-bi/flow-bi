package com.flowbi.domain.user.dto;

import com.flowbi.domain.user.entity.WorkStatus;

public record OrganizationChartUserDetailResponse(String profileImageUrl, String name,
    String position, String team, String extensionNumber, String email, String accountStatus,
    WorkStatus workStatus) {
}
