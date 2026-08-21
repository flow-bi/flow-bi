package com.flowbi.domain.room.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.flowbi.domain.auth.security.LoginPrincipal;
import com.flowbi.domain.auth.security.SecurityConfiguration;
import com.flowbi.domain.auth.session.AbsoluteSessionTimeoutFilter;
import com.flowbi.domain.auth.session.SessionGenerationService;
import com.flowbi.domain.room.dto.ReservationActor;
import com.flowbi.domain.room.dto.RoomReservationApplicationException;
import com.flowbi.domain.room.service.RoomAvailabilityService;
import com.flowbi.domain.room.service.RoomReservationDetailService;
import com.flowbi.domain.room.service.RoomReservationService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = RoomController.class)
@Import({SecurityConfiguration.class, AbsoluteSessionTimeoutFilter.class})
class RoomReservationCancellationSecurityIntegrationTest {

  @Autowired
  private MockMvc mockMvc;
  @MockitoBean
  private RoomAvailabilityService availabilityService;
  @MockitoBean
  private RoomReservationDetailService reservationDetailService;
  @MockitoBean
  private RoomReservationService reservationService;
  @MockitoBean
  private SessionGenerationService sessionGenerationService;

  @Test
  void cancelsWithOnlyTheLoginPrincipalAndIgnoresForgedUserIds() throws Exception {
    mockMvc.perform(delete("/api/room-reservations/5").with(user(principal(10L)))
        .session(authenticatedSession()).with(csrf()).requestAttr("authenticatedUser",99L)
        .header("X-User-Id","99").param("userId","99").content("{\"userId\":99}")
        .contentType("application/json")).andExpect(status().isNoContent());

    ArgumentCaptor<ReservationActor> actor = ArgumentCaptor.forClass(ReservationActor.class);
    verify(reservationService).cancel(actor.capture(),org.mockito.Mockito.eq(5L));
    assertThat(actor.getValue().userId()).isEqualTo(10L);
  }

  @Test
  void rejectsAnonymousAndHidesUnownedReservationsBehindTheSameNotFoundContract() throws Exception {
    mockMvc.perform(delete("/api/room-reservations/5").with(csrf()))
        .andExpect(status().isUnauthorized());
    verify(reservationService,never()).cancel(any(),any());

    doThrow(new RoomReservationApplicationException("ROOM_RESERVATION_NOT_FOUND"))
        .when(reservationService).cancel(any(),any());
    mockMvc
        .perform(delete("/api/room-reservations/5").with(user(principal(99L)))
            .session(authenticatedSession()).with(csrf()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("ROOM_RESERVATION_NOT_FOUND"));
    mockMvc
        .perform(delete("/api/room-reservations/999999").with(user(principal(99L)))
            .session(authenticatedSession()).with(csrf()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("ROOM_RESERVATION_NOT_FOUND"));
  }

  @Test
  void rejectsCancellationWithoutCsrfBeforeCallingTheReservationService() throws Exception {
    mockMvc
        .perform(delete("/api/room-reservations/5").with(user(principal(10L)))
            .session(authenticatedSession()))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_VALIDATION_FAILED"));
    verify(reservationService,never()).cancel(any(),any());
  }

  private LoginPrincipal principal(long userId) {
    return new LoginPrincipal(Long.toString(userId), false);
  }

  private MockHttpSession authenticatedSession() {
    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionGenerationService.AUTH_GENERATION_ATTRIBUTE,0L);
    return session;
  }
}
