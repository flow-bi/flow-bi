package com.flowbi.domain.room.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.room.dto.RoomAvailabilityResponse;
import com.flowbi.domain.room.dto.RoomAvailabilityStatus;
import com.flowbi.domain.room.dto.RoomDetailResponse;
import com.flowbi.domain.room.dto.RoomNotFoundException;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.dto.RoomReservationDetailResponse;
import com.flowbi.domain.room.dto.CreateRoomReservationResult;
import com.flowbi.domain.room.dto.UpdateRoomReservationCommand;
import com.flowbi.domain.room.dto.UpdateRoomReservationResult;
import com.flowbi.domain.room.service.RoomAvailabilityService;
import com.flowbi.domain.room.service.RoomReservationDetailService;
import com.flowbi.domain.room.service.RoomReservationService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

class RoomControllerTest {

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
  void returnsRoomAvailabilityUsingTheSuppliedQueryParameters() throws Exception {
    when(availabilityService.findAvailability(any(),Mockito.eq(10L)))
        .thenReturn(new RoomAvailabilityResponse(
            List.of(new RoomAvailabilityResponse.RoomSummary(1L, "A", 8L, "1F", true, List.of()))));

    mockMvc
        .perform(get("/api/rooms").principal(authentication()).param("date","2026-08-10")
            .param("startTime","10:00").param("endTime","11:00").param("minimumCapacity","6")
            .param("availabilityStatus","AVAILABLE"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.rooms[0].id").value(1));

    ArgumentCaptor<com.flowbi.domain.room.dto.RoomAvailabilityQuery> query = ArgumentCaptor
        .forClass(com.flowbi.domain.room.dto.RoomAvailabilityQuery.class);
    verify(availabilityService).findAvailability(query.capture(),Mockito.eq(10L));
    org.assertj.core.api.Assertions.assertThat(query.getValue())
        .isEqualTo(new com.flowbi.domain.room.dto.RoomAvailabilityQuery(LocalDate.of(2026,8,10),
            LocalTime.of(10,0), LocalTime.of(11,0), 6, RoomAvailabilityStatus.AVAILABLE));
  }

  @Test
  void acceptsTheAuthenticatedSpringSecurityPrincipalUsedByTheLoginSession() throws Exception {
    when(availabilityService.findAvailability(any(),Mockito.eq(10L)))
        .thenReturn(new RoomAvailabilityResponse(List.of()));
    LoginPrincipal principal = new LoginPrincipal("10", false);

    mockMvc
        .perform(get("/api/rooms").principal(UsernamePasswordAuthenticationToken
            .authenticated(principal,"",principal.getAuthorities())).param("date","2026-08-10"))
        .andExpect(status().isOk());

    verify(availabilityService).findAvailability(any(),Mockito.eq(10L));
  }

  @Test
  void returnsRoomDetailsAndMapsMissingRoomsToNotFound() throws Exception {
    when(availabilityService.findRoomDetail(1L))
        .thenReturn(new RoomDetailResponse(1L, "A", 8L, "1F", true));

    mockMvc.perform(get("/api/rooms/1").principal(authentication())).andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("A"));

    when(availabilityService.findRoomDetail(99L)).thenThrow(new RoomNotFoundException());
    mockMvc.perform(get("/api/rooms/99").principal(authentication()))
        .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
  }

  @Test
  void returnsOnlyTheOwnersReservationEditDetails() throws Exception {
    when(reservationDetailService.findOwnedReservation(10L,5L))
        .thenReturn(new RoomReservationDetailResponse(5L, 1L, "Planning",
            LocalDateTime.of(2026,8,10,10,0), LocalDateTime.of(2026,8,10,11,0), true, List.of(11L),
            List.of(new RoomReservationDetailResponse.Attendee(11L, "Attendee")), "Discuss plan",
            true));

    mockMvc.perform(get("/api/room-reservations/5").principal(authentication()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.roomId").value(1))
        .andExpect(jsonPath("$.creatorAttends").value(true))
        .andExpect(jsonPath("$.attendeeIds[0]").value(11))
        .andExpect(jsonPath("$.attendees[0].userId").value(11))
        .andExpect(jsonPath("$.attendees[0].displayName").value("Attendee"))
        .andExpect(jsonPath("$.attendees[0].email").doesNotExist())
        .andExpect(jsonPath("$.description").value("Discuss plan"))
        .andExpect(jsonPath("$.editable").value(true));
  }

  @Test
  void rejectsMissingAuthenticationBeforeCallingServices() throws Exception {
    mockMvc.perform(get("/api/rooms")).andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

    verify(availabilityService,never()).findAvailability(any());
    verify(reservationDetailService,never()).findOwnedReservation(any(),any());
  }

  @Test
  void mapsInvalidQueriesToBadRequest() throws Exception {
    mockMvc.perform(get("/api/rooms").principal(authentication()).param("date","not-a-date"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("ROOM_QUERY_INVALID"));
  }

  @Test
  void returnsTheSameNotFoundResponseForMissingAndUnownedReservations() throws Exception {
    when(reservationDetailService.findOwnedReservation(10L,5L))
        .thenThrow(new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"));
    when(reservationDetailService.findOwnedReservation(10L,6L))
        .thenThrow(new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"));

    mockMvc.perform(get("/api/room-reservations/5").principal(authentication()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("ROOM_RESERVATION_NOT_FOUND"));
    mockMvc.perform(get("/api/room-reservations/6").principal(authentication()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("ROOM_RESERVATION_NOT_FOUND"));
  }

  @Test
  void createsReservationUsingAuthenticatedActorAndRequestBody() throws Exception {
    when(reservationService.create(any(),any()))
        .thenReturn(new CreateRoomReservationResult(5L, 9L));

    mockMvc
        .perform(post("/api/room-reservations").principal(authentication())
            .contentType("application/json").content("""
                {"roomId":1,"title":"Planning","startAt":"2026-08-10T10:00:00",
                "endAt":"2026-08-10T11:00:00","creatorAttends":true,"attendeeIds":[11],
                "description":"Discuss plan"}
                """))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.reservationId").value(5))
        .andExpect(jsonPath("$.scheduleId").value(9));

    ArgumentCaptor<com.flowbi.domain.room.dto.ReservationActor> actor = ArgumentCaptor
        .forClass(com.flowbi.domain.room.dto.ReservationActor.class);
    ArgumentCaptor<com.flowbi.domain.room.dto.CreateRoomReservationCommand> command = ArgumentCaptor
        .forClass(com.flowbi.domain.room.dto.CreateRoomReservationCommand.class);
    verify(reservationService).create(actor.capture(),command.capture());
    org.assertj.core.api.Assertions.assertThat(actor.getValue().userId()).isEqualTo(10L);
    org.assertj.core.api.Assertions.assertThat(command.getValue())
        .isEqualTo(new com.flowbi.domain.room.dto.CreateRoomReservationCommand(1L, "Planning",
            LocalDateTime.of(2026,8,10,10,0), LocalDateTime.of(2026,8,10,11,0), List.of(11L), true,
            "Discuss plan"));
  }

  @Test
  void mapsCreationErrorsAndRejectsMissingAuthenticationBeforeCallingReservationService()
      throws Exception {
    mockMvc.perform(post("/api/room-reservations").contentType("application/json").content("{}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    verify(reservationService,never()).create(any(),any());

    assertCreationError("ROOM_RESERVATION_INVALID",400);
    assertCreationError("RESERVATION_PARTICIPANT_FORBIDDEN",403);
    assertCreationError("ROOM_NOT_FOUND",404);
    assertCreationError("ROOM_CAPACITY_EXCEEDED",409);
    assertCreationError("ROOM_RESERVATION_CONFLICT",409);
  }

  @Test
  void updatesReservationUsingThePathIdAuthenticatedActorAndRequestBody() throws Exception {
    when(reservationService.update(any(),any()))
        .thenReturn(new UpdateRoomReservationResult(5L, 9L));

    mockMvc
        .perform(put("/api/room-reservations/5").principal(authentication())
            .contentType("application/json").content("""
                {"roomId":2,"title":"Updated planning","startAt":"2026-08-10T10:00:00",
                "endAt":"2026-08-10T11:00:00","creatorAttends":false,"attendeeIds":[11],
                "description":"Updated plan"}
                """))
        .andExpect(status().isOk()).andExpect(jsonPath("$.reservationId").value(5))
        .andExpect(jsonPath("$.scheduleId").value(9));

    ArgumentCaptor<com.flowbi.domain.room.dto.ReservationActor> actor = ArgumentCaptor
        .forClass(com.flowbi.domain.room.dto.ReservationActor.class);
    ArgumentCaptor<UpdateRoomReservationCommand> command = ArgumentCaptor
        .forClass(UpdateRoomReservationCommand.class);
    verify(reservationService).update(actor.capture(),command.capture());
    org.assertj.core.api.Assertions.assertThat(actor.getValue().userId()).isEqualTo(10L);
    org.assertj.core.api.Assertions.assertThat(command.getValue())
        .isEqualTo(new UpdateRoomReservationCommand(5L, 2L, "Updated planning",
            LocalDateTime.of(2026,8,10,10,0), LocalDateTime.of(2026,8,10,11,0), List.of(11L), false,
            "Updated plan"));
  }

  @Test
  void mapsUpdateErrorsAndRejectsMissingAuthenticationBeforeCallingReservationService()
      throws Exception {
    mockMvc.perform(put("/api/room-reservations/5").contentType("application/json").content("{}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    verify(reservationService,never()).update(any(),any());

    assertUpdateError("ROOM_RESERVATION_INVALID",400);
    assertUpdateError("RESERVATION_PARTICIPANT_FORBIDDEN",403);
    assertUpdateError("ROOM_RESERVATION_NOT_FOUND",404);
    assertUpdateError("ROOM_NOT_FOUND",404);
    assertUpdateError("ROOM_RESERVATION_NOT_EDITABLE",409);
    assertUpdateError("ROOM_CAPACITY_EXCEEDED",409);
    assertUpdateError("ROOM_RESERVATION_CONFLICT",409);
  }

  @Test
  void returnsTheSameNotFoundResponseForMissingAndUnownedReservationUpdates() throws Exception {
    when(reservationService.update(any(),any()))
        .thenThrow(new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"));

    mockMvc.perform(updateRequest(5L)).andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("ROOM_RESERVATION_NOT_FOUND"));
    mockMvc.perform(updateRequest(6L)).andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("ROOM_RESERVATION_NOT_FOUND"));
  }

  @Test
  void cancelsWithTheAuthenticatedActorAndReturnsNoContent() throws Exception {
    mockMvc.perform(delete("/api/room-reservations/5").principal(authentication()))
        .andExpect(status().isNoContent());

    ArgumentCaptor<com.flowbi.domain.room.dto.ReservationActor> actor = ArgumentCaptor
        .forClass(com.flowbi.domain.room.dto.ReservationActor.class);
    verify(reservationService).cancel(actor.capture(),Mockito.eq(5L));
    org.assertj.core.api.Assertions.assertThat(actor.getValue().userId()).isEqualTo(10L);
  }

  @Test
  void rejectsUnauthenticatedAndHidesUnownedCancellationTargets() throws Exception {
    mockMvc.perform(delete("/api/room-reservations/5")).andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    verify(reservationService,never()).cancel(any(),any());

    doThrow(new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"))
        .when(reservationService).cancel(any(),any());
    mockMvc.perform(delete("/api/room-reservations/6").principal(authentication()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("ROOM_RESERVATION_NOT_FOUND"));

    doThrow(new RoomReservationApplicationException("ROOM_RESERVATION_CANCEL_CONFLICT"))
        .when(reservationService).cancel(any(),any());
    mockMvc.perform(delete("/api/room-reservations/7").principal(authentication()))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ROOM_RESERVATION_CANCEL_CONFLICT"));
  }

  private void assertCreationError(String code,int expectedStatus) throws Exception {
    reset(reservationService);
    when(reservationService.create(any(),any()))
        .thenThrow(new RoomReservationApplicationException(code));

    mockMvc
        .perform(post("/api/room-reservations").principal(authentication())
            .contentType("application/json").content("""
                {"roomId":1,"title":"Planning","startAt":"2026-08-10T10:00:00",
                "endAt":"2026-08-10T11:00:00","attendeeIds":[10],"description":"Plan"}
                """))
        .andExpect(status().is(expectedStatus)).andExpect(jsonPath("$.code").value(code));
  }

  private void assertUpdateError(String code,int expectedStatus) throws Exception {
    reset(reservationService);
    when(reservationService.update(any(),any()))
        .thenThrow(new RoomReservationApplicationException(code));

    mockMvc.perform(updateRequest(5L)).andExpect(status().is(expectedStatus))
        .andExpect(jsonPath("$.code").value(code));
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder updateRequest(
      Long reservationId) {
    return put("/api/room-reservations/{reservationId}",reservationId).principal(authentication())
        .contentType("application/json").content("""
            {"roomId":1,"title":"Planning","startAt":"2026-08-10T10:00:00",
            "endAt":"2026-08-10T11:00:00","attendeeIds":[10],"description":"Plan"}
            """);
  }

  private Authentication authentication() {
    LoginPrincipal principal = new LoginPrincipal("10", false);
    return UsernamePasswordAuthenticationToken.authenticated(principal,"",
        principal.getAuthorities());
  }
}
