package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ScheduleUpdateTest {

  private static final Instant START = Instant.parse("2026-08-10T09:00:00Z");
  private static final Instant END = Instant.parse("2026-08-10T10:00:00Z");

  @Test
  void ownerCanAtomicallyUpdateTypeTargetsAndDeduplicatedAttendees() {
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(
        List.of(ScheduleFixtures.personal(1L,10L,START,END)));
    ScheduleUpdateService service = service(repository,10L,Set.of(100L),Set.of(200L),
        Set.of(20L,21L));

    ScheduleDetailResponse updated = service.update(1L,request(ScheduleType.TEAM,
        List.of(ScheduleTarget.team(100L)),List.of(10L,20L,20L,21L),true));

    assertThat(updated.type()).isEqualTo(ScheduleType.TEAM);
    assertThat(updated.visibility()).isEqualTo(ScheduleVisibility.TEAM);
    assertThat(updated.attendeeCount()).isEqualTo(3);
    assertThat(repository.findById(1L).orElseThrow().getAttendees())
        .extracting(ScheduleAttendee::userId).containsExactly(20L,21L);
  }

  @Test
  void rejectsInvalidUpdateWithoutReplacingTheExistingSchedule() {
    Schedule original = ScheduleFixtures.personal(1L,10L,START,END);
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(List.of(original));
    ScheduleUpdateService service = service(repository,10L,Set.of(),Set.of(),Set.of());

    assertThatThrownBy(() -> service.update(1L,
        new ScheduleUpdateRequest("Changed", ScheduleType.PERSONAL, null, ScheduleColorLabel.RED,
            false, END, START, "Busan", "Changed", List.of(), List.of(), false)))
        .isInstanceOf(ScheduleValidationException.class);

    Schedule unchanged = repository.findById(1L).orElseThrow();
    assertThat(unchanged.getTitle()).isEqualTo("Planning");
    assertThat(unchanged.getStartAt()).isEqualTo(START);
  }

  @Test
  void rejectsBlankDetailFieldsWithoutReplacingTheExistingSchedule() {
    Schedule original = ScheduleFixtures.personal(1L,10L,START,END);
    InMemoryScheduleRepository repository = new InMemoryScheduleRepository(List.of(original));
    ScheduleUpdateService service = service(repository,10L,Set.of(),Set.of(),Set.of());

    assertThatThrownBy(() -> service.update(1L,
        new ScheduleUpdateRequest("Changed", ScheduleType.PERSONAL, null, ScheduleColorLabel.RED,
            false, START, END, " ", "Changed", List.of(), List.of(), false)))
        .isInstanceOf(ScheduleValidationException.class);

    assertThat(repository.findById(1L).orElseThrow().getTitle()).isEqualTo("Planning");
  }

  @Test
  void leavesTheExistingScheduleUnchangedWhenPersistenceFails() {
    Schedule original = ScheduleFixtures.personal(1L,10L,START,END);
    FailingUpdateRepository repository = new FailingUpdateRepository(original);
    ScheduleUpdateService service = service(repository,10L,Set.of(),Set.of(),Set.of());

    assertThatThrownBy(
        () -> service.update(1L,request(ScheduleType.PERSONAL,List.of(),List.of(),false)))
        .isInstanceOf(SchedulePersistenceException.class);

    assertThat(repository.findById(1L).orElseThrow().getTitle()).isEqualTo("Planning");
  }

  @Test
  void rejectsAnActiveRoomReservationLinkedSchedule() {
    Schedule roomLinked = ScheduleFixtures.roomReservationLinkedPersonal(1L,10L,START,END);
    ScheduleUpdateService service = service(new InMemoryScheduleRepository(List.of(roomLinked)),10L,
        Set.of(),Set.of(),Set.of());

    assertThatThrownBy(
        () -> service.update(1L,request(ScheduleType.PERSONAL,List.of(),List.of(),false)))
        .isInstanceOf(ScheduleRoomReservationManagedException.class);
  }

  private ScheduleUpdateService service(ScheduleRepository repository,Long userId,Set<Long> teams,
      Set<Long> projects,Set<Long> activeUsers) {
    return new ScheduleUpdateService(repository, () -> Optional.of(userId),
        new CreationMembershipReader(teams, projects), activeUsers::contains,
        ScheduleChangeAuditLogger.noop());
  }

  private ScheduleUpdateRequest request(ScheduleType type,List<ScheduleTarget> targets,
      List<Long> attendeeIds,boolean creatorAttending) {
    return new ScheduleUpdateRequest("Changed", type, null, ScheduleColorLabel.RED, false, START,
        END, "Busan", "Changed", targets, attendeeIds, creatorAttending);
  }
}

final class FailingUpdateRepository implements ScheduleRepository {
  private final Schedule schedule;

  FailingUpdateRepository(Schedule schedule) {
    this.schedule = schedule;
  }

  @Override
  public List<Schedule> findActiveOverlapping(Instant from,Instant to) {
    return List.of(schedule);
  }

  @Override
  public Optional<Schedule> findById(Long scheduleId) {
    return schedule.getId().equals(scheduleId) ? Optional.of(schedule) : Optional.empty();
  }

  @Override
  public Optional<Schedule> findByIdIncludingCancelled(Long scheduleId) {
    return findById(scheduleId);
  }

  @Override
  public Schedule save(Schedule schedule) {
    throw new SchedulePersistenceException();
  }

  @Override
  public Schedule update(Schedule schedule) {
    throw new SchedulePersistenceException();
  }
}
