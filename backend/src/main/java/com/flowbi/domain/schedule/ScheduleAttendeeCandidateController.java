package com.flowbi.domain.schedule;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/schedules/attendee-candidates")
public class ScheduleAttendeeCandidateController {

  private final ScheduleAttendeeCandidateService candidateService;

  public ScheduleAttendeeCandidateController(ScheduleAttendeeCandidateService candidateService) {
    this.candidateService = candidateService;
  }

  @GetMapping
  public ResponseEntity<?> search(@RequestParam(required = false) String query) {
    try {
      return ResponseEntity.ok(candidateService.search(query));
    } catch (ScheduleAuthenticationRequiredException exception) {
      return error(HttpStatus.UNAUTHORIZED,"AUTHENTICATION_REQUIRED");
    } catch (ScheduleValidationException exception) {
      return error(HttpStatus.BAD_REQUEST,"INVALID_ATTENDEE_QUERY");
    }
  }

  private ResponseEntity<Map<String, String>> error(HttpStatus status,String code) {
    return ResponseEntity.status(status)
        .body(Map.of("code",code,"message","Unable to search schedule attendees."));
  }
}
