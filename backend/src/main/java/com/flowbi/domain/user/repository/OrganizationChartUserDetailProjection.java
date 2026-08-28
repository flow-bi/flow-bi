package com.flowbi.domain.user.repository;

import com.flowbi.domain.user.entity.UserStatus;
import com.flowbi.domain.user.entity.WorkStatus;

public record OrganizationChartUserDetailProjection(String profileImageUrl, String name,
    String position, String team, String extensionNumber, String email, UserStatus accountStatus,
    WorkStatus workStatus) {
}
