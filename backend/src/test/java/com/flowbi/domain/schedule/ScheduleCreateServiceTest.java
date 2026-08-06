package com.flowbi.domain.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.flowbi.domain.schedule.port.ScheduleReferenceValidator;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ScheduleCreateServiceTest {

  @Test
  void validatesReferencesBeforePersistingTheCompleteScheduleAggregate() {
    ScheduleReferenceValidator referenceValidator = mock(ScheduleReferenceValidator.class);
    ScheduleRepository repository = mock(ScheduleRepository.class);
    ScheduleCreateTransaction transaction = new ScheduleCreateTransaction(repository);
    ScheduleCreateService service = new ScheduleCreateService(referenceValidator, transaction);
    ScheduleCreateCommand command = ScheduleCreateCommand.of(1L,"Planning",ScheduleType.TEAM,
        ScheduleVisibility.TEAM,OffsetDateTime.parse("2026-08-10T09:00:00+09:00"),
        OffsetDateTime.parse("2026-08-10T10:00:00+09:00"),false,ScheduleColorLabel.BLUE,"Scope",
        "Room A",true,List.of(2L,3L),List.of(4L),List.of(10L),List.of());
    when(repository.saveAndFlush(org.mockito.ArgumentMatchers.any(Schedule.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    Schedule saved = service.create(command);

    verify(referenceValidator).validateForCreation(command);
    verify(repository).saveAndFlush(org.mockito.ArgumentMatchers.any(Schedule.class));
    assertThat(saved.attendeeCount()).isEqualTo(3);
    assertThat(saved.getParticipants()).hasSize(2);
    assertThat(saved.getTargets()).hasSize(2);
  }
}
