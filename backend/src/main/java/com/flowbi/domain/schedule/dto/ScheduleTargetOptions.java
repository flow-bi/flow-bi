package com.flowbi.domain.schedule.dto;

import java.util.List;

public record ScheduleTargetOptions(List<ScheduleTargetOption> teams,
    List<ScheduleTargetOption> projects) {
}
