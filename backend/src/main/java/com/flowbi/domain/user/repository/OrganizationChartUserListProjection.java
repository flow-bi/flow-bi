package com.flowbi.domain.user.repository;

import com.flowbi.domain.user.entity.UserStatus;
import com.flowbi.domain.user.entity.WorkStatus;

public record OrganizationChartUserListProjection(Long userId, String name, String position,
    UserStatus accountStatus, WorkStatus workStatus, String profileImageUrl) {
}
