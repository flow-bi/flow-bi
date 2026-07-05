package com.flowbi.domain.schedule.controller;

import com.flowbi.common.response.ApiResponse;
import com.flowbi.common.security.JwtAuthenticationFilter;
import com.flowbi.common.security.JwtClaims;
import com.flowbi.domain.schedule.dto.ScheduleRequest;
import com.flowbi.domain.schedule.dto.ScheduleResponse;
import com.flowbi.domain.schedule.dto.ScheduleView;
import com.flowbi.domain.schedule.service.ScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Schedule", description = "일정 관리 API")
@RestController
@RequestMapping("/api/v1/schedules")
public class ScheduleController {

  private final ScheduleService scheduleService;

  public ScheduleController(ScheduleService scheduleService) {
    this.scheduleService = scheduleService;
  }

  @Operation(summary = "캘린더 일정 조회")
  @GetMapping
  public ApiResponse<List<ScheduleResponse>> findCalendar(HttpServletRequest servletRequest,
      @RequestParam(defaultValue = "month") String view,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
    return ApiResponse.success(scheduleService.findCalendar(currentUserId(servletRequest),
        ScheduleView.valueOf(view.toUpperCase()),date == null ? LocalDate.now() : date));
  }

  @Operation(summary = "일정 상세 조회")
  @GetMapping("/{scheduleId}")
  public ApiResponse<ScheduleResponse> findById(HttpServletRequest servletRequest,
      @PathVariable Long scheduleId) {
    return ApiResponse.success(scheduleService.findById(currentUserId(servletRequest),scheduleId));
  }

  @Operation(summary = "일정 생성")
  @PostMapping
  public ApiResponse<ScheduleResponse> create(HttpServletRequest servletRequest,
      @Valid @RequestBody ScheduleRequest request) {
    return ApiResponse.success(scheduleService.create(currentUserId(servletRequest),request),
        "일정이 생성되었습니다.");
  }

  @Operation(summary = "일정 수정")
  @PatchMapping("/{scheduleId}")
  public ApiResponse<ScheduleResponse> update(HttpServletRequest servletRequest,
      @PathVariable Long scheduleId,@Valid @RequestBody ScheduleRequest request) {
    return ApiResponse.success(
        scheduleService.update(currentUserId(servletRequest),scheduleId,request),"일정이 수정되었습니다.");
  }

  @Operation(summary = "일정 삭제")
  @DeleteMapping("/{scheduleId}")
  public ApiResponse<Void> delete(HttpServletRequest servletRequest,@PathVariable Long scheduleId) {
    scheduleService.delete(currentUserId(servletRequest),scheduleId);
    return ApiResponse.success(null,"일정이 삭제되었습니다.");
  }

  private Long currentUserId(HttpServletRequest request) {
    JwtClaims claims = (JwtClaims) request
        .getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ATTRIBUTE);
    return claims.userId();
  }
}
