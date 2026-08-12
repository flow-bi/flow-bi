package com.flowbi.domain.room.dto;

public record RoomDetailResponse(Long id, String name, Long capacity, String location,
    boolean usesDefaultImage) {
}
