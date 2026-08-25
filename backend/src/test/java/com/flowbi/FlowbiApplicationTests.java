package com.flowbi;

import com.flowbi.domain.schedule.port.ScheduleAuditWriter;
import com.flowbi.domain.schedule.port.ScheduleAudienceLookup;
import com.flowbi.domain.schedule.port.ScheduleReferenceValidator;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import java.util.Set;
import org.junit.jupiter.api.Test;
import com.flowbi.test.PostgresSpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

@PostgresSpringBootTest
@Import(FlowbiApplicationTests.CalendarBoundaryConfiguration.class)
class FlowbiApplicationTests {

  @Test
  void contextLoads() {
  }

  @TestConfiguration
  static class CalendarBoundaryConfiguration {

    @Bean
    @Primary
    ScheduleReferenceValidator scheduleReferenceValidator() {
      return command -> {
      };
    }

    @Bean
    @Primary
    ScheduleAudienceLookup scheduleAudienceLookup() {
      return new ScheduleAudienceLookup() {
        @Override
        public Set<Long> memberTeamIds(long actorId,Set<Long> teamIds) {
          return Set.of();
        }

        @Override
        public Set<Long> memberProjectIds(long actorId,Set<Long> projectIds) {
          return Set.of();
        }
      };
    }

    @Bean
    @Primary
    ScheduleRoomReservationLookup scheduleRoomReservationLookup() {
      return scheduleId -> false;
    }

    @Bean
    @Primary
    ScheduleAuditWriter scheduleAuditWriter() {
      return event -> {
      };
    }
  }

}
