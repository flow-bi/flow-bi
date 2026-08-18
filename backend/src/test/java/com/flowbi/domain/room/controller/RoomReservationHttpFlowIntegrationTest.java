package com.flowbi.domain.room.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.dto.AuthenticatedUser;
import com.flowbi.domain.auth.dto.AuthenticatedUser.Role;
import com.flowbi.domain.room.dto.CreateRoomReservationResult;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomAvailabilityResponse;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.dto.RoomReservationDetailResponse;
import com.flowbi.domain.room.dto.UpdateRoomReservationResult;
import com.flowbi.domain.room.service.RoomAvailabilityService;
import com.flowbi.domain.room.service.RoomReservationDetailService;
import com.flowbi.domain.room.service.RoomReservationService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class RoomReservationHttpFlowIntegrationTest {

  private final RoomAvailabilityService availabilityService = Mockito
      .mock(RoomAvailabilityService.class);
  private final RoomReservationDetailService reservationDetailService = Mockito
      .mock(RoomReservationDetailService.class);
  private final RoomReservationService reservationService = Mockito
      .mock(RoomReservationService.class);
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders
        .standaloneSetup(
            new RoomController(availabilityService, reservationDetailService, reservationService))
        .setControllerAdvice(new RoomApiExceptionHandler()).build();
  }

  @Test
  void connectsAnAuthenticatedUsersReadCreateAndUpdateHttpFlow() throws Exception {
    RoomAvailabilityResponse availability = new RoomAvailabilityResponse(
        List.of(new RoomAvailabilityResponse.RoomSummary(1L, "Orchid", 8L, "3F", true,
            List.of(new RoomAvailabilityResponse.ReservationSummary(5L, "Planning",
                LocalDateTime.of(2026,8,10,10,0), LocalDateTime.of(2026,8,10,11,0),
                com.flowbi.domain.room.dto.ReservationDisplayStatus.UPCOMING, true)))));
    when(availabilityService.findAvailability(any(),Mockito.eq(10L))).thenReturn(availability);
    when(reservationDetailService.findOwnedReservation(10L,5L)).thenReturn(
        new RoomReservationDetailResponse(5L, 1L, "Planning", LocalDateTime.of(2026,8,10,10,0),
            LocalDateTime.of(2026,8,10,11,0), List.of(10L), "Initial", true));
    when(reservationService.create(any(),any()))
        .thenReturn(new CreateRoomReservationResult(6L, 16L));
    when(reservationService.update(any(),any()))
        .thenReturn(new UpdateRoomReservationResult(5L, 15L));

    mockMvc
        .perform(
            get("/api/rooms").requestAttr("authenticatedUser",user()).param("date","2026-08-10"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.rooms[0].reservations[0].id").value(5))
        .andExpect(jsonPath("$.rooms[0].reservations[0].canEdit").value(true));
    mockMvc.perform(get("/api/room-reservations/5").requestAttr("authenticatedUser",user()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.reservationId").value(5));
    mockMvc
        .perform(post("/api/room-reservations").requestAttr("authenticatedUser",user())
            .contentType("application/json").content(requestBody("New planning")))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.reservationId").value(6))
        .andExpect(jsonPath("$.scheduleId").value(16));
    mockMvc
        .perform(put("/api/room-reservations/5").requestAttr("authenticatedUser",user())
            .contentType("application/json").content(requestBody("Updated planning")))
        .andExpect(status().isOk()).andExpect(jsonPath("$.reservationId").value(5))
        .andExpect(jsonPath("$.scheduleId").value(15));
    ArgumentCaptor<ReservationActor> actors = ArgumentCaptor.forClass(ReservationActor.class);
    verify(reservationService).create(actors.capture(),any());
    verify(reservationService).update(actors.capture(),any());
    org.assertj.core.api.Assertions.assertThat(actors.getAllValues())
        .extracting(ReservationActor::userId).containsOnly(10L);
  }

  @Test
  void rejectsEveryProtectedEndpointBeforeInvokingAnyRoomService() throws Exception {
    mockMvc.perform(get("/api/rooms").param("date","2026-08-10"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    mockMvc.perform(get("/api/rooms/1")).andExpect(status().isUnauthorized());
    mockMvc.perform(get("/api/room-reservations/5")).andExpect(status().isUnauthorized());
    mockMvc.perform(post("/api/room-reservations").contentType("application/json")
        .content(requestBody("Planning"))).andExpect(status().isUnauthorized());
    mockMvc.perform(put("/api/room-reservations/5").contentType("application/json")
        .content(requestBody("Planning"))).andExpect(status().isUnauthorized());

    verify(availabilityService,never()).findAvailability(any(),any());
    verify(availabilityService,never()).findRoomDetail(any());
    verify(reservationDetailService,never()).findOwnedReservation(any(),any());
    verify(reservationService,never()).create(any(),any());
    verify(reservationService,never()).update(any(),any());
  }

  @Test
  void returnsTheSameNotFoundContractForUnownedAndMissingReservationMutations() throws Exception {
    when(reservationDetailService.findOwnedReservation(10L,5L))
        .thenThrow(new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"));
    when(reservationDetailService.findOwnedReservation(10L,6L))
        .thenThrow(new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"));
    when(reservationService.update(any(),any()))
        .thenThrow(new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"));

    for (long reservationId : List.of(5L,6L)) {
      mockMvc
          .perform(get("/api/room-reservations/{reservationId}",reservationId)
              .requestAttr("authenticatedUser",user()))
          .andExpect(status().isNotFound())
          .andExpect(jsonPath("$.code").value("ROOM_RESERVATION_NOT_FOUND"));
      mockMvc
          .perform(put("/api/room-reservations/{reservationId}",reservationId)
              .requestAttr("authenticatedUser",user()).contentType("application/json")
              .content(requestBody("Planning")))
          .andExpect(status().isNotFound())
          .andExpect(jsonPath("$.code").value("ROOM_RESERVATION_NOT_FOUND"));
    }
  }

  private String requestBody(String title) {
    return """
        {"roomId":1,"title":"%s","startAt":"2026-08-10T10:00:00",
        "endAt":"2026-08-10T11:00:00","attendeeIds":[10],"description":"Plan"}
        """.formatted(title);
  }

  private AuthenticatedUser user() {
    return new AuthenticatedUser(10L, Role.USER);
  }
}
