package com.flowbi.domain.room.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@ActiveProfiles("harness")
@AutoConfigureMockMvc
@SpringBootTest
class RoomOpenApiContractTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void documentsTheRoomReadParametersResponsesAndAuthenticationErrors() throws Exception {
    mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/rooms'].get.parameters[?(@.name=='date')]").isNotEmpty())
        .andExpect(jsonPath("$.paths['/api/rooms/{roomId}'].get.responses['401']").exists())
        .andExpect(
            jsonPath("$.paths['/api/room-reservations/{reservationId}'].get.responses['404']")
                .exists())
        .andExpect(
            jsonPath("$.components.schemas.RoomReservationDetailResponse.properties.scheduleId")
                .doesNotExist())
        .andExpect(
            jsonPath("$.components.schemas.RoomReservationDetailResponse.properties.attendees")
                .exists())
        .andExpect(jsonPath("$.components.schemas.Attendee.properties.userId").exists())
        .andExpect(jsonPath("$.components.schemas.Attendee.properties.displayName").exists())
        .andExpect(jsonPath("$.components.schemas.Attendee.properties.email").doesNotExist())
        .andExpect(jsonPath("$.components.schemas.Attendee.properties.phoneNumber").doesNotExist())
        .andExpect(
            jsonPath("$.components.schemas.Attendee.properties.employeeNumber").doesNotExist())
        .andExpect(jsonPath("$.components.schemas.Attendee.properties.teamId").doesNotExist())
        .andExpect(jsonPath("$.components.schemas.Attendee.properties.status").doesNotExist());
  }

  @Test
  void documentsReservationCreationWithoutAuthenticationIdentityFields() throws Exception {
    mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/room-reservations'].post.responses['201']").exists())
        .andExpect(jsonPath("$.paths['/api/room-reservations'].post.responses['400']").exists())
        .andExpect(jsonPath("$.paths['/api/room-reservations'].post.responses['401']").exists())
        .andExpect(jsonPath("$.paths['/api/room-reservations'].post.responses['403']").exists())
        .andExpect(jsonPath("$.paths['/api/room-reservations'].post.responses['404']").exists())
        .andExpect(jsonPath("$.paths['/api/room-reservations'].post.responses['409']").exists())
        .andExpect(jsonPath("$.components.schemas.CreateRoomReservationRequest.properties.roomId")
            .exists())
        .andExpect(
            jsonPath("$.components.schemas.CreateRoomReservationRequest.properties.title").exists())
        .andExpect(jsonPath("$.components.schemas.CreateRoomReservationRequest.properties.startAt")
            .exists())
        .andExpect(
            jsonPath("$.components.schemas.CreateRoomReservationRequest.properties.endAt").exists())
        .andExpect(
            jsonPath("$.components.schemas.CreateRoomReservationRequest.properties.attendeeIds")
                .exists())
        .andExpect(
            jsonPath("$.components.schemas.CreateRoomReservationRequest.properties.description")
                .exists())
        .andExpect(jsonPath("$.components.schemas.CreateRoomReservationRequest.properties.userId")
            .doesNotExist())
        .andExpect(jsonPath("$.components.schemas.CreateRoomReservationRequest.properties.role")
            .doesNotExist())
        .andExpect(
            jsonPath("$.components.schemas.CreateRoomReservationResult.properties.reservationId")
                .exists())
        .andExpect(
            jsonPath("$.components.schemas.CreateRoomReservationResult.properties.scheduleId")
                .exists());
  }

  @Test
  void documentsReservationUpdateWithoutAuthenticationOrReservationIdentityFields()
      throws Exception {
    mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andExpect(
        jsonPath("$.paths['/api/room-reservations/{reservationId}'].put.responses['200']").exists())
        .andExpect(
            jsonPath("$.paths['/api/room-reservations/{reservationId}'].put.responses['400']")
                .exists())
        .andExpect(
            jsonPath("$.paths['/api/room-reservations/{reservationId}'].put.responses['401']")
                .exists())
        .andExpect(
            jsonPath("$.paths['/api/room-reservations/{reservationId}'].put.responses['403']")
                .exists())
        .andExpect(
            jsonPath("$.paths['/api/room-reservations/{reservationId}'].put.responses['404']")
                .exists())
        .andExpect(
            jsonPath("$.paths['/api/room-reservations/{reservationId}'].put.responses['409']")
                .exists())
        .andExpect(jsonPath("$.components.schemas.UpdateRoomReservationRequest.properties.roomId")
            .exists())
        .andExpect(jsonPath("$.components.schemas.UpdateRoomReservationRequest.properties.userId")
            .doesNotExist())
        .andExpect(
            jsonPath("$.components.schemas.UpdateRoomReservationRequest.properties.reservationId")
                .doesNotExist())
        .andExpect(
            jsonPath("$.components.schemas.UpdateRoomReservationResult.properties.reservationId")
                .exists())
        .andExpect(
            jsonPath("$.components.schemas.UpdateRoomReservationResult.properties.scheduleId")
                .exists());
  }

  @Test
  void documentsReservationSummaryEditabilityAndCancellationResponses() throws Exception {
    mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
        .andExpect(jsonPath("$.components.schemas.ReservationSummary.properties.canEdit").exists())
        .andExpect(
            jsonPath("$.paths['/api/room-reservations/{reservationId}'].delete.responses['204']")
                .exists())
        .andExpect(
            jsonPath("$.paths['/api/room-reservations/{reservationId}'].delete.responses['401']")
                .exists())
        .andExpect(
            jsonPath("$.paths['/api/room-reservations/{reservationId}'].delete.responses['404']")
                .exists())
        .andExpect(
            jsonPath("$.paths['/api/room-reservations/{reservationId}'].delete.responses['409']")
                .exists());
  }
}
