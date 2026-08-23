package com.flowbi.domain.team.dto;

import java.util.List;

public record TeamHierarchyResponse(Long teamId, String teamName, int depth,
    List<TeamHierarchyResponse> children) {
}
