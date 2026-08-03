package com.flowbi.domain.schedule;

import java.time.Instant;
import java.util.List;
import java.util.Set;

final class ScheduleFixtures {

  private ScheduleFixtures() {
  }

  static Schedule personal(Long id,Long creatorId,Instant start,Instant end) {
    return schedule(id,creatorId,ScheduleType.PERSONAL,ScheduleVisibility.PRIVATE,List.of(),
        List.of(),start,end,false);
  }

  static Schedule cancelledPersonal(Long id,Long creatorId,Instant start,Instant end) {
    return schedule(id,creatorId,ScheduleType.PERSONAL,ScheduleVisibility.PRIVATE,List.of(),
        List.of(),start,end,true);
  }

  static Schedule roomReservationLinkedPersonal(Long id,Long creatorId,Instant start,Instant end) {
    return new Schedule(id, "Planning", ScheduleType.PERSONAL, ScheduleVisibility.PRIVATE,
        ScheduleColorLabel.BLUE, false, start, end, creatorId,
        new ScheduleDetail("Seoul", "Planning"), List.of(), List.of(), true, false, true);
  }

  static Schedule personalWithAttendee(Long id,Long creatorId,Long attendeeId,Instant start,
      Instant end) {
    return schedule(id,creatorId,ScheduleType.PERSONAL,ScheduleVisibility.PRIVATE,List.of(),
        List.of(attendeeId),start,end,false);
  }

  static Schedule team(Long id,Long creatorId,Long teamId,Instant start,Instant end) {
    return schedule(id,creatorId,ScheduleType.TEAM,ScheduleVisibility.TEAM,
        List.of(ScheduleTarget.team(teamId)),List.of(),start,end,false);
  }

  static Schedule teamWithAttendee(Long id,Long creatorId,Long teamId,Long attendeeId,Instant start,
      Instant end) {
    return schedule(id,creatorId,ScheduleType.TEAM,ScheduleVisibility.TEAM,
        List.of(ScheduleTarget.team(teamId)),List.of(attendeeId),start,end,false);
  }

  static Schedule project(Long id,Long creatorId,Long projectId,Instant start,Instant end) {
    return schedule(id,creatorId,ScheduleType.PROJECT,ScheduleVisibility.PROJECT,
        List.of(ScheduleTarget.project(projectId)),List.of(),start,end,false);
  }

  static Schedule projectWithAttendee(Long id,Long creatorId,Long projectId,Long attendeeId,
      Instant start,Instant end) {
    return schedule(id,creatorId,ScheduleType.PROJECT,ScheduleVisibility.PROJECT,
        List.of(ScheduleTarget.project(projectId)),List.of(attendeeId),start,end,false);
  }

  static ScheduleQueryService serviceFor(Long userId,List<Schedule> schedules) {
    return new ScheduleQueryService(new InMemoryScheduleRepository(schedules),
        () -> java.util.Optional.of(userId), ScheduleMembershipReader.none());
  }

  static ScheduleQueryService serviceForTeamMember(Long userId,Long teamId,
      List<Schedule> schedules) {
    return new ScheduleQueryService(new InMemoryScheduleRepository(schedules),
        () -> java.util.Optional.of(userId), new FixedMembershipReader(Set.of(teamId), Set.of()));
  }

  static ScheduleQueryService serviceForProjectMember(Long userId,Long projectId,
      List<Schedule> schedules) {
    return new ScheduleQueryService(new InMemoryScheduleRepository(schedules),
        () -> java.util.Optional.of(userId),
        new FixedMembershipReader(Set.of(), Set.of(projectId)));
  }

  private static Schedule schedule(Long id,Long creatorId,ScheduleType type,
      ScheduleVisibility visibility,List<ScheduleTarget> targets,List<Long> attendeeIds,
      Instant start,Instant end,boolean cancelled) {
    return new Schedule(id, "Planning", type, visibility, ScheduleColorLabel.BLUE, false, start,
        end, creatorId, new ScheduleDetail("Seoul", "Planning"), targets,
        attendeeIds.stream().map(ScheduleAttendee::new).toList(), true, cancelled);
  }
}

record FixedMembershipReader(Set<Long> teamIds,
    Set<Long> projectIds) implements ScheduleMembershipReader {
  @Override
  public boolean belongsToAnyTeam(Long userId,Set<Long> candidateTeamIds) {
    return candidateTeamIds.stream().anyMatch(teamIds::contains);
  }

  @Override
  public boolean participatesInAnyProject(Long userId,Set<Long> candidateProjectIds) {
    return candidateProjectIds.stream().anyMatch(projectIds::contains);
  }
}
