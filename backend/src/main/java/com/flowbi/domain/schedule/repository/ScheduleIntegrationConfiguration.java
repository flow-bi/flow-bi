package com.flowbi.domain.schedule.repository;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.service.*;

import com.flowbi.domain.schedule.port.ScheduleAuditWriter;
import com.flowbi.domain.schedule.port.ScheduleAudienceLookup;
import com.flowbi.domain.schedule.port.ScheduleReferenceValidator;
import com.flowbi.domain.schedule.port.ScheduleRoomReservationLookup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
class ScheduleIntegrationConfiguration {

  private static final Logger AUDIT_LOG = LoggerFactory.getLogger("calendar.audit");

  @Bean
  JdbcScheduleIdentityAdapter jdbcScheduleIdentityAdapter(JdbcTemplate jdbcTemplate) {
    return new JdbcScheduleIdentityAdapter(jdbcTemplate);
  }

  @Bean
  @ConditionalOnMissingBean(ScheduleReferenceValidator.class)
  ScheduleReferenceValidator databaseScheduleReferenceValidator(
      JdbcScheduleIdentityAdapter adapter) {
    return adapter::validateForCreation;
  }

  @Bean
  @ConditionalOnMissingBean(ScheduleAudienceLookup.class)
  ScheduleAudienceLookup databaseScheduleAudienceLookup(JdbcScheduleIdentityAdapter adapter) {
    return new ScheduleAudienceLookup() {
      @Override
      public java.util.Set<Long> memberTeamIds(long actorId,java.util.Set<Long> teamIds) {
        return adapter.memberTeamIds(actorId,teamIds);
      }

      @Override
      public java.util.Set<Long> memberProjectIds(long actorId,java.util.Set<Long> projectIds) {
        return adapter.memberProjectIds(actorId,projectIds);
      }
    };
  }

  @Bean
  @ConditionalOnMissingBean(ScheduleRoomReservationLookup.class)
  ScheduleRoomReservationLookup defaultScheduleRoomReservationLookup() {
    return new ScheduleRoomReservationLookup() {
      @Override
      public boolean isManagedSchedule(long scheduleId) {
        return false;
      }

      @Override
      public java.util.Set<Long> managedScheduleIds(java.util.Collection<Long> scheduleIds) {
        return java.util.Set.of();
      }
    };
  }

  @Bean
  @ConditionalOnMissingBean(ScheduleAuditWriter.class)
  ScheduleAuditWriter loggingScheduleAuditWriter() {
    return event -> AUDIT_LOG.info("actorId={}, occurredAt={}, scheduleId={}, result={}",
        event.actorId(),event.occurredAt(),event.scheduleId(),event.result());
  }
}
