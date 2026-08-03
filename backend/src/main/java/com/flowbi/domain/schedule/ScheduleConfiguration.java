package com.flowbi.domain.schedule;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class ScheduleConfiguration {

  @Bean
  ScheduleRepository scheduleRepository() {
    return new InMemoryScheduleRepository(List.of());
  }

  @Bean
  ScheduleUserProvider scheduleUserProvider() {
    return ScheduleUserProvider.unauthenticated();
  }

  @Bean
  ScheduleMembershipReader scheduleMembershipReader() {
    return ScheduleMembershipReader.none();
  }

  @Bean
  ScheduleActiveUserReader scheduleActiveUserReader() {
    return ScheduleActiveUserReader.none();
  }

  @Bean
  ScheduleAttendeeCandidateReader scheduleAttendeeCandidateReader() {
    return ScheduleAttendeeCandidateReader.none();
  }

  @Bean
  ScheduleCreationAuditLogger scheduleCreationAuditLogger() {
    return ScheduleCreationAuditLogger.noop();
  }

  @Bean
  ScheduleChangeAuditLogger scheduleChangeAuditLogger() {
    return ScheduleChangeAuditLogger.noop();
  }
}
