package com.flowbi.domain.room.controller;

import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.room.dto.RoomAvailabilityQuery;
import com.flowbi.domain.room.dto.RoomAvailabilityResponse;
import com.flowbi.domain.room.dto.RoomAvailabilityStatus;
import com.flowbi.domain.room.dto.CreateRoomReservationRequest;
import com.flowbi.domain.room.dto.CreateRoomReservationResult;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomDetailResponse;
import com.flowbi.domain.room.dto.RoomReservationDetailResponse;
import com.flowbi.domain.room.dto.UpdateRoomReservationRequest;
import com.flowbi.domain.room.dto.UpdateRoomReservationResult;
import com.flowbi.domain.room.service.RoomAvailabilityService;
import com.flowbi.domain.room.service.RoomReservationDetailService;
import com.flowbi.domain.room.service.RoomReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@Tag(name = "Rooms")
@RestController
@RequestMapping("/api")
public class RoomController {

  private final RoomAvailabilityService availabilityService;
  private final RoomReservationDetailService reservationDetailService;
  private final RoomReservationService reservationService;

  public RoomController(RoomAvailabilityService availabilityService,
      RoomReservationDetailService reservationDetailService,
      RoomReservationService reservationService) {
    this.availabilityService = availabilityService;
    this.reservationDetailService = reservationDetailService;
    this.reservationService = reservationService;
  }

  @Operation(summary = "회의실 목록과 예약 현황 조회")
  @ApiResponses({@ApiResponse(responseCode = "200", description = "회의실 목록"),
      @ApiResponse(responseCode = "400", description = "잘못된 조회 조건", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class)))})
  @Parameters({
      @Parameter(name = "date", required = true, schema = @Schema(type = "string", format = "date")),
      @Parameter(name = "startTime", schema = @Schema(type = "string", format = "time")),
      @Parameter(name = "endTime", schema = @Schema(type = "string", format = "time")),
      @Parameter(name = "minimumCapacity", schema = @Schema(type = "integer", format = "int32")),
      @Parameter(name = "availabilityStatus", schema = @Schema(implementation = RoomAvailabilityStatus.class))})
  @GetMapping("/rooms")
  public RoomAvailabilityResponse findRooms(@RequestParam Map<String, String> parameters,
      Authentication authentication) {
    long userId = authenticatedUserId(authentication);
    return availabilityService.findAvailability(toAvailabilityQuery(parameters),userId);
  }

  @Operation(summary = "회의실 상세 조회")
  @ApiResponses({@ApiResponse(responseCode = "200", description = "회의실 상세"),
      @ApiResponse(responseCode = "400", description = "잘못된 회의실 ID", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "404", description = "회의실 없음", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class)))})
  @GetMapping("/rooms/{roomId}")
  public RoomDetailResponse findRoom(@Parameter(in = ParameterIn.PATH) @PathVariable Long roomId,
      Authentication authentication) {
    authenticatedUserId(authentication);
    return availabilityService.findRoomDetail(roomId);
  }

  @Operation(summary = "내 회의실 예약 수정 상세 조회")
  @ApiResponses({@ApiResponse(responseCode = "200", description = "예약 수정 상세"),
      @ApiResponse(responseCode = "400", description = "잘못된 예약 ID", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "404", description = "예약이 없거나 접근 불가", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class)))})
  @GetMapping("/room-reservations/{reservationId}")
  public RoomReservationDetailResponse findReservation(
      @Parameter(in = ParameterIn.PATH) @PathVariable Long reservationId,
      Authentication authentication) {
    return reservationDetailService.findOwnedReservation(authenticatedUserId(authentication),
        reservationId);
  }

  @Operation(summary = "회의실 예약과 연결 일정 생성")
  @ApiResponses({
      @ApiResponse(responseCode = "201", description = "예약과 일정 생성", content = @Content(schema = @Schema(implementation = CreateRoomReservationResult.class))),
      @ApiResponse(responseCode = "400", description = "잘못된 예약 입력", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "403", description = "참석자 접근 권한 없음", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "404", description = "회의실 없음", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "409", description = "수용 인원 또는 예약 시간 충돌", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class)))})
  @org.springframework.web.bind.annotation.PostMapping("/room-reservations")
  public ResponseEntity<CreateRoomReservationResult> createReservation(
      @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(schema = @Schema(implementation = CreateRoomReservationRequest.class))) @RequestBody CreateRoomReservationRequest request,
      Authentication authentication) {
    CreateRoomReservationResult result = reservationService
        .create(new ReservationActor(authenticatedUserId(authentication)),request.toCommand());
    return ResponseEntity.status(HttpStatus.CREATED).body(result);
  }

  @Operation(summary = "회의실 예약과 연결 일정 수정")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "예약과 일정 수정", content = @Content(schema = @Schema(implementation = UpdateRoomReservationResult.class))),
      @ApiResponse(responseCode = "400", description = "잘못된 예약 입력", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "403", description = "참석자 접근 권한 없음", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "404", description = "예약 또는 회의실 없음", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "409", description = "수정 불가, 수용 인원 또는 예약 시간 충돌", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class)))})
  @PutMapping("/room-reservations/{reservationId}")
  public UpdateRoomReservationResult updateReservation(
      @Parameter(in = ParameterIn.PATH) @PathVariable Long reservationId,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(schema = @Schema(implementation = UpdateRoomReservationRequest.class))) @RequestBody UpdateRoomReservationRequest request,
      Authentication authentication) {
    return reservationService.update(new ReservationActor(authenticatedUserId(authentication)),
        request.toCommand(reservationId));
  }

  @Operation(summary = "회의실 예약과 연결 일정 취소")
  @ApiResponses({@ApiResponse(responseCode = "204", description = "예약과 일정 취소"),
      @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "404", description = "예약이 없거나 접근 불가", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class))),
      @ApiResponse(responseCode = "409", description = "취소 충돌", content = @Content(schema = @Schema(implementation = RoomApiErrorResponse.class)))})
  @DeleteMapping("/room-reservations/{reservationId}")
  public ResponseEntity<Void> cancelReservation(
      @Parameter(in = ParameterIn.PATH) @PathVariable Long reservationId,
      Authentication authentication) {
    reservationService.cancel(new ReservationActor(authenticatedUserId(authentication)),
        reservationId);
    return ResponseEntity.noContent().build();
  }

  private long authenticatedUserId(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()
        || !(authentication.getPrincipal() instanceof LoginPrincipal principal)) {
      throw new AuthenticationRequiredException();
    }
    try {
      long userId = Long.parseLong(principal.userId());
      if (userId < 1) {
        throw new AuthenticationRequiredException();
      }
      return userId;
    } catch (NumberFormatException exception) {
      throw new AuthenticationRequiredException();
    }
  }

  private RoomAvailabilityQuery toAvailabilityQuery(Map<String, String> parameters) {
    try {
      if (parameters.get("date") == null || parameters.get("date").isBlank()) {
        throw new com.flowbi.domain.room.dto.RoomQueryValidationException();
      }
      return new RoomAvailabilityQuery(LocalDate.parse(parameters.get("date")),
          parseTime(parameters.get("startTime")), parseTime(parameters.get("endTime")),
          parseInteger(parameters.get("minimumCapacity")),
          parseStatus(parameters.get("availabilityStatus")));
    } catch (DateTimeException | IllegalArgumentException error) {
      throw new com.flowbi.domain.room.dto.RoomQueryValidationException();
    }
  }

  private LocalTime parseTime(String value) {
    return value == null || value.isBlank() ? null : LocalTime.parse(value);
  }

  private Integer parseInteger(String value) {
    return value == null || value.isBlank() ? null : Integer.valueOf(value);
  }

  private RoomAvailabilityStatus parseStatus(String value) {
    return value == null || value.isBlank() ? null : RoomAvailabilityStatus.valueOf(value);
  }
}
