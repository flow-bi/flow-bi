package com.flowbi.domain.schedule.controller;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.exception.*;
import com.flowbi.domain.schedule.repository.*;
import com.flowbi.domain.schedule.service.*;

import com.flowbi.domain.auth.security.LoginPrincipal;
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

  ScheduleController(ScheduleCreateService createService, ScheduleQueryService queryService,
      ScheduleDetailService detailService, ScheduleUpdateService updateService,
      ScheduleCancelService cancelService, ScheduleIdentityService identityService) {
    this.createService = createService;
    this.queryService = queryService;
    this.detailService = detailService;
    this.updateService = updateService;
    this.cancelService = cancelService;
    this.identityService = identityService;
  }

  @GetMapping
  List<ScheduleListItem> list(@RequestParam OffsetDateTime from,@RequestParam OffsetDateTime to,
      Authentication authentication) {
    long actorId = actorId(authentication);
    return queryService.query(ScheduleQuery.of(actorId,from,to));
  }

  @GetMapping("/{scheduleId}")
  ScheduleDetailResponse detail(@PathVariable long scheduleId,Authentication authentication) {
    return detailService.find(actorId(authentication),scheduleId);
  }

  @GetMapping("/attendee-candidates")
  AttendeeCandidates attendees(@RequestParam String query,Authentication authentication) {
    actorId(authentication);
    return new AttendeeCandidates(identityService.searchActiveUsers(query));
  }

  @PostMapping
  ResponseEntity<ScheduleDetailResponse> create(@RequestBody ScheduleWriteRequest request,
      Authentication authentication) {
    long actorId = actorId(authentication);
    Schedule schedule = createService.create(request.toCreateCommand(actorId));
    return ResponseEntity.created(URI.create("/api/schedules/" + schedule.getId()))
        .body(detailService.find(actorId,schedule.getId()));
  }

  @PutMapping("/{scheduleId}")
  ScheduleDetailResponse update(@PathVariable long scheduleId,
      @RequestBody ScheduleWriteRequest request,Authentication authentication) {
    long actorId = actorId(authentication);
    updateService.update(actorId,scheduleId,request.toUpdateCommand());
    return detailService.find(actorId,scheduleId);
  }

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
