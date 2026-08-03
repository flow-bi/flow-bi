package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ScheduleTransactionTest {

  @Test
  void leavesNoScheduleWhenAggregatePersistenceFails() {
    FailingScheduleRepository repository = new FailingScheduleRepository();
    ScheduleCreateService service = new ScheduleCreateService(repository, () -> Optional.of(10L),
        new CreationMembershipReader(Set.of(), Set.of()), userId -> true,
        ScheduleCreationAuditLogger.noop());
    Instant start = Instant.parse("2026-08-10T10:00:00Z");

    assertThatThrownBy(() -> service.create(new ScheduleCreateRequest("Planning",
        ScheduleType.PERSONAL, null, ScheduleColorLabel.BLUE, false, start, start.plusSeconds(60),
        "Seoul", "Details", List.of(), List.of(20L), false)))
        .isInstanceOf(SchedulePersistenceException.class);

    assertThat(repository.findActiveOverlapping(start,start.plusSeconds(60))).isEmpty();
  }
}

final class FailingScheduleRepository implements ScheduleRepository {
  @Override
  public List<Schedule> findActiveOverlapping(Instant from,Instant to) {
    return List.of();
  }

  @Override
  public Optional<Schedule> findById(Long scheduleId) {
    return Optional.empty();
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
