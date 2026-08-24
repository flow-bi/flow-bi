package com.flowbi.domain.schedule.controller;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;
import com.flowbi.domain.schedule.service.*;

import com.flowbi.domain.auth.security.LoginPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/schedules")
class ScheduleController {

  private final ScheduleCreateService createService;
  private final ScheduleQueryService queryService;
  private final ScheduleDetailService detailService;
  private final ScheduleUpdateService updateService;
  private final ScheduleCancelService cancelService;
  private final ScheduleIdentityService identityService;
  private final ScheduleTargetOptionsService targetOptionsService;

  ScheduleController(ScheduleCreateService createService, ScheduleQueryService queryService,
      ScheduleDetailService detailService, ScheduleUpdateService updateService,
      ScheduleCancelService cancelService, ScheduleIdentityService identityService,
      ScheduleTargetOptionsService targetOptionsService) {
    this.createService = createService;
    this.queryService = queryService;
    this.detailService = detailService;
    this.updateService = updateService;
    this.cancelService = cancelService;
    this.identityService = identityService;
    this.targetOptionsService = targetOptionsService;
  }

  @Operation(summary = "기간별 일정 조회")
  @GetMapping
  List<ScheduleListItem> list(@RequestParam OffsetDateTime from,@RequestParam OffsetDateTime to,
      Authentication authentication) {
    long actorId = actorId(authentication);
    return queryService.query(ScheduleQuery.of(actorId,from,to));
  }

  @Operation(summary = "일정 상세 조회")
  @GetMapping("/{scheduleId}")
  ScheduleDetailResponse detail(@PathVariable long scheduleId,Authentication authentication) {
    return detailService.find(actorId(authentication),scheduleId);
  }

  @Operation(summary = "일정 참석자 후보 검색")
  @GetMapping("/attendee-candidates")
  AttendeeCandidates attendees(@RequestParam String query,Authentication authentication) {
    long actorId = actorId(authentication);
    return new AttendeeCandidates(identityService.searchActiveUsers(query,actorId));
  }

  @Operation(summary = "일정 대상 선택지 조회")
  @GetMapping("/target-options")
  ScheduleTargetOptions targetOptions(Authentication authentication) {
    return targetOptionsService.findForActor(actorId(authentication));
  }

  @Operation(summary = "일정 생성")
  @PostMapping
  ResponseEntity<ScheduleDetailResponse> create(@RequestBody ScheduleWriteRequest request,
      Authentication authentication) {
    long actorId = actorId(authentication);
    Schedule schedule = createService.create(request.toCreateCommand(actorId));
    return ResponseEntity.created(URI.create("/api/schedules/" + schedule.getId()))
        .body(detailService.find(actorId,schedule.getId()));
  }

  @Operation(summary = "일정 수정")
  @PutMapping("/{scheduleId}")
  ScheduleDetailResponse update(@PathVariable long scheduleId,
      @RequestBody ScheduleWriteRequest request,Authentication authentication) {
    long actorId = actorId(authentication);
    updateService.update(actorId,scheduleId,request.toUpdateCommand());
    return detailService.find(actorId,scheduleId);
  }

  @Operation(summary = "일정 취소")
  @DeleteMapping("/{scheduleId}")
  ResponseEntity<Void> cancel(@PathVariable long scheduleId,Authentication authentication) {
    cancelService.cancel(actorId(authentication),scheduleId);
    return ResponseEntity.noContent().build();
  }

  private long actorId(Authentication authentication) {
    if (!(authentication.getPrincipal() instanceof LoginPrincipal principal)) {
      throw new ScheduleActorInactiveException();
    }
    try {
      long actorId = Long.parseLong(principal.userId());
      identityService.requireActiveActor(actorId);
      return actorId;
    } catch (NumberFormatException exception) {
      throw new ScheduleActorInactiveException();
    }
  }

}
