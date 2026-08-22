package com.flowbi.domain.team.repository;

public record TeamHierarchyClosureRow(Long ancestorTeamId, Long descendantTeamId, int depth) {
}
