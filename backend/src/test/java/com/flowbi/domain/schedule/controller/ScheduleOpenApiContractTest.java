package com.flowbi.domain.schedule.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import com.flowbi.test.PostgresSpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@ActiveProfiles("harness")
@AutoConfigureMockMvc
@PostgresSpringBootTest
class ScheduleOpenApiContractTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void documentsCalendarOperationSummaries() throws Exception {
    mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/schedules'].get.summary").value("기간별 일정 조회"))
        .andExpect(jsonPath("$.paths['/api/schedules'].post.summary").value("일정 생성"))
        .andExpect(jsonPath("$.paths['/api/schedules/{scheduleId}'].get.summary").value("일정 상세 조회"))
        .andExpect(jsonPath("$.paths['/api/schedules/{scheduleId}'].put.summary").value("일정 수정"))
        .andExpect(jsonPath("$.paths['/api/schedules/{scheduleId}'].delete.summary").value("일정 취소"))
        .andExpect(jsonPath("$.paths['/api/schedules/attendee-candidates'].get.summary")
            .value("일정 참석자 후보 검색"))
        .andExpect(
            jsonPath("$.paths['/api/schedules/target-options'].get.summary").value("일정 대상 선택지 조회"));
  }
}
