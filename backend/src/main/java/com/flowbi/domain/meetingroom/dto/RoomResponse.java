package com.flowbi.domain.meetingroom.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public record RoomResponse(@Schema(description = "회의실 ID") @JsonProperty("room_id") Long roomId,
    @Schema(description = "회의실 이름") @JsonProperty("room_name") String roomName,
    @Schema(description = "수용 인원") Long capacity, @Schema(description = "위치") String location,
    @Schema(description = "장비/비고") String field,
    @Schema(description = "조회 날짜의 예약 목록") List<ReservationResponse> reservations) {
}
