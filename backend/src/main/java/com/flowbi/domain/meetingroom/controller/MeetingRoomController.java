package com.flowbi.domain.meetingroom.controller;

import com.flowbi.common.exception.BusinessException;
import com.flowbi.common.exception.ErrorCode;
import com.flowbi.common.response.ApiResponse;
import com.flowbi.common.security.JwtAuthenticationFilter;
import com.flowbi.common.security.JwtClaims;
import com.flowbi.domain.meetingroom.dto.ReservationRequest;
import com.flowbi.domain.meetingroom.dto.ReservationResponse;
import com.flowbi.domain.meetingroom.dto.RoomResponse;
import com.flowbi.domain.meetingroom.entity.ReservationStatus;
import com.flowbi.domain.meetingroom.service.MeetingRoomService;
import com.flowbi.domain.meetingroom.service.MeetingRoomService.TimeRange;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.LocalTime;
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

@Tag(name = "MeetingRoom", description = "회의실 예약 API")
@RestController
@RequestMapping("/api/v1/rooms")
public class MeetingRoomController {

  private final MeetingRoomService meetingRoomService;

  public MeetingRoomController(MeetingRoomService meetingRoomService) {
    this.meetingRoomService = meetingRoomService;
  }

  @Operation(summary = "회의실 목록 조회")
  @GetMapping
  public ApiResponse<List<RoomResponse>> findRooms(@RequestParam(required = false) Long capacity,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
      @RequestParam(required = false) String timeRange,
      @RequestParam(required = false) ReservationStatus status) {
    return ApiResponse
        .success(meetingRoomService.findRooms(capacity,date,parseTimeRange(timeRange),status));
  }

  @Operation(summary = "회의실 예약 현황 조회")
  @GetMapping("/{roomId}/reservations")
  public ApiResponse<List<ReservationResponse>> findReservations(@PathVariable Long roomId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
    return ApiResponse.success(meetingRoomService.findReservations(roomId,date));
  }

  @Operation(summary = "회의실 예약 생성")
  @PostMapping("/{roomId}/reservations")
  public ApiResponse<ReservationResponse> createReservation(HttpServletRequest servletRequest,
      @PathVariable Long roomId,@Valid @RequestBody ReservationRequest request) {
    return ApiResponse.success(
        meetingRoomService.createReservation(currentUserId(servletRequest),roomId,request),
        "회의실 예약이 생성되었습니다.");
  }

  @Operation(summary = "회의실 예약 수정")
  @PatchMapping("/reservations/{reservationId}")
  public ApiResponse<ReservationResponse> updateReservation(HttpServletRequest servletRequest,
      @PathVariable Long reservationId,@Valid @RequestBody ReservationRequest request) {
    return ApiResponse.success(
        meetingRoomService.updateReservation(currentUserId(servletRequest),reservationId,request),
        "회의실 예약이 수정되었습니다.");
  }

  @Operation(summary = "회의실 예약 취소")
  @DeleteMapping("/reservations/{reservationId}")
  public ApiResponse<Void> cancelReservation(HttpServletRequest servletRequest,
      @PathVariable Long reservationId) {
    meetingRoomService.cancelReservation(currentUserId(servletRequest),reservationId);
    return ApiResponse.success(null,"회의실 예약이 취소되었습니다.");
  }

  private TimeRange parseTimeRange(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String[] parts = value.split("-");
    if (parts.length != 2) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, "timeRange는 HH:mm-HH:mm 형식이어야 합니다.");
    }
    try {
      LocalTime start = LocalTime.parse(parts[0]);
      LocalTime end = LocalTime.parse(parts[1]);
      if (!start.isBefore(end)) {
        throw new BusinessException(ErrorCode.VALIDATION_FAILED,
            "timeRange 종료 시간은 시작 시간보다 이후여야 합니다.");
      }
      return new TimeRange(start, end);
    } catch (RuntimeException exception) {
      if (exception instanceof BusinessException businessException) {
        throw businessException;
      }
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, "timeRange는 HH:mm-HH:mm 형식이어야 합니다.");
    }
  }

  private Long currentUserId(HttpServletRequest request) {
    JwtClaims claims = (JwtClaims) request
        .getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ATTRIBUTE);
    return claims.userId();
  }
}
