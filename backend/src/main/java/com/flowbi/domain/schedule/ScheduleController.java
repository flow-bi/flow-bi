package com.flowbi.domain.schedule;

import java.time.format.DateTimeParseException;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {

  private final ScheduleQueryService queryService;
  private final ScheduleCreateService createService;
  private final ScheduleUpdateService updateService;
  private final ScheduleDeleteService deleteService;

  @Autowired
  public ScheduleController(ScheduleQueryService queryService, ScheduleCreateService createService,
      ScheduleUpdateService updateService, ScheduleDeleteService deleteService) {
    this.queryService = queryService;
    this.createService = createService;
    this.updateService = updateService;
    this.deleteService = deleteService;
  }

  public ScheduleController(ScheduleQueryService queryService,
      ScheduleCreateService createService) {
    this(queryService, createService, null, null);
  }

  public ScheduleController(ScheduleQueryService queryService) {
    this(queryService, null, null, null);
  }

  @PostMapping
  public ResponseEntity<?> createSchedule(@RequestBody ScheduleCreateRequest request) {
    try {
      return ResponseEntity.status(HttpStatus.CREATED).body(createService.create(request));
    } catch (ScheduleValidationException exception) {
      return error(HttpStatus.BAD_REQUEST,"INVALID_SCHEDULE_REQUEST");
    } catch (ScheduleAuthenticationRequiredException exception) {
      return error(HttpStatus.UNAUTHORIZED,"AUTHENTICATION_REQUIRED");
    } catch (SchedulePersistenceException exception) {
      return error(HttpStatus.INTERNAL_SERVER_ERROR,"SCHEDULE_CREATION_FAILED");
    }
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, String>> handleUnreadableRequest(
      HttpMessageNotReadableException exception) {
    return error(HttpStatus.BAD_REQUEST,"INVALID_SCHEDULE_REQUEST");
  }

  @PutMapping("/{scheduleId}")
  public ResponseEntity<?> updateSchedule(@PathVariable String scheduleId,
      @RequestBody ScheduleUpdateRequest request) {
    try {
      return ResponseEntity.ok(updateService.update(Long.parseLong(scheduleId),request));
    } catch (NumberFormatException exception) {
      return error(HttpStatus.BAD_REQUEST,"INVALID_SCHEDULE_ID");
    } catch (ScheduleAuthenticationRequiredException exception) {
      return error(HttpStatus.UNAUTHORIZED,"AUTHENTICATION_REQUIRED");
    } catch (ScheduleNotFoundException exception) {
      return error(HttpStatus.NOT_FOUND,"SCHEDULE_NOT_FOUND");
    } catch (ScheduleRoomReservationManagedException exception) {
      return error(HttpStatus.CONFLICT,"ROOM_RESERVATION_MANAGED_SCHEDULE");
    } catch (ScheduleValidationException exception) {
      return error(HttpStatus.BAD_REQUEST,"INVALID_SCHEDULE_REQUEST");
    } catch (SchedulePersistenceException exception) {
      return error(HttpStatus.INTERNAL_SERVER_ERROR,"SCHEDULE_UPDATE_FAILED");
    }
  }

  @DeleteMapping("/{scheduleId}")
  public ResponseEntity<?> deleteSchedule(@PathVariable String scheduleId) {
    try {
      deleteService.delete(Long.parseLong(scheduleId));
      return ResponseEntity.noContent().build();
    } catch (NumberFormatException exception) {
      return error(HttpStatus.BAD_REQUEST,"INVALID_SCHEDULE_ID");
    } catch (ScheduleAuthenticationRequiredException exception) {
      return error(HttpStatus.UNAUTHORIZED,"AUTHENTICATION_REQUIRED");
    } catch (ScheduleNotFoundException exception) {
      return error(HttpStatus.NOT_FOUND,"SCHEDULE_NOT_FOUND");
    } catch (ScheduleRoomReservationManagedException exception) {
      return error(HttpStatus.CONFLICT,"ROOM_RESERVATION_MANAGED_SCHEDULE");
    } catch (ScheduleDeletionPolicyNotApprovedException exception) {
      return error(HttpStatus.CONFLICT,"SCHEDULE_DELETION_POLICY_NOT_APPROVED");
    }
  }

  @GetMapping
  public ResponseEntity<?> getSchedules(@RequestParam String from,@RequestParam String to) {
    try {
      return ResponseEntity.ok(queryService.getSchedules(from,to));
    } catch (DateTimeParseException | IllegalArgumentException exception) {
      return error(HttpStatus.BAD_REQUEST,"INVALID_SCHEDULE_PERIOD");
    } catch (ScheduleAuthenticationRequiredException exception) {
      return error(HttpStatus.UNAUTHORIZED,"AUTHENTICATION_REQUIRED");
    }
  }

  @GetMapping("/{scheduleId}")
  public ResponseEntity<?> getSchedule(@PathVariable String scheduleId) {
    try {
      return ResponseEntity.ok(queryService.getSchedule(Long.parseLong(scheduleId)));
    } catch (NumberFormatException exception) {
      return error(HttpStatus.BAD_REQUEST,"INVALID_SCHEDULE_ID");
    } catch (ScheduleAuthenticationRequiredException exception) {
      return error(HttpStatus.UNAUTHORIZED,"AUTHENTICATION_REQUIRED");
    } catch (ScheduleNotFoundException exception) {
      return error(HttpStatus.NOT_FOUND,"SCHEDULE_NOT_FOUND");
    }
  }

  private ResponseEntity<Map<String, String>> error(HttpStatus status,String code) {
    return ResponseEntity.status(status)
        .body(Map.of("code",code,"message","Unable to process schedule request."));
  }
}
