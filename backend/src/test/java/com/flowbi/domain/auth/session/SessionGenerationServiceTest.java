package com.flowbi.domain.auth.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;

class SessionGenerationServiceTest {

  @Test
  void rejectsAnAuthenticatedSessionWhenItsGenerationKeyIsMissing() {
    SessionGenerationStore store = mock(SessionGenerationStore.class);
    SessionIndexCleanup cleanup = mock(SessionIndexCleanup.class);
    SessionGenerationService service = new SessionGenerationService(store, cleanup);
    when(store.currentGeneration("42")).thenReturn(java.util.OptionalLong.empty());

    assertThatThrownBy(() -> service.verify("42",3L,"session-1"))
        .isInstanceOf(SessionGenerationValidationException.class);
  }

  @Test
  void rejectsMismatchedGenerationAndCleansUpIndexedSessionsIdempotently() {
    SessionGenerationStore store = mock(SessionGenerationStore.class);
    SessionIndexCleanup cleanup = mock(SessionIndexCleanup.class);
    SessionGenerationService service = new SessionGenerationService(store, cleanup);
    when(store.currentGeneration("42")).thenReturn(java.util.OptionalLong.of(4L));

    assertThatThrownBy(() -> service.verify("42",3L,"session-1"))
        .isInstanceOf(SessionGenerationValidationException.class);
    verify(cleanup).deleteAllExcept("42",null);
  }

  @Test
  void permitsOnlyTheRetainedSessionWhileAChangeIsInProgress() {
    SessionGenerationStore store = mock(SessionGenerationStore.class);
    SessionIndexCleanup cleanup = mock(SessionIndexCleanup.class);
    SessionGenerationService service = new SessionGenerationService(store, cleanup);
    when(store.currentGeneration("42")).thenReturn(java.util.OptionalLong.of(4L));
    when(store.changeInProgress("42")).thenReturn(java.util.Optional.of("session-1"));

    service.verify("42",4L,"session-1");

    assertThatThrownBy(() -> service.verify("42",4L,"session-2"))
        .isInstanceOf(SessionGenerationValidationException.class);
    verify(cleanup).deleteAllExcept("42","session-1");
  }

  @Test
  void delegatesLoginGenerationToTheAtomicStoreOperation() {
    SessionGenerationStore store = mock(SessionGenerationStore.class);
    SessionIndexCleanup cleanup = mock(SessionIndexCleanup.class);
    SessionGenerationService service = new SessionGenerationService(store, cleanup);
    when(store.generationForNewSession("42",true)).thenReturn(3L);

    assertThat(service.generationForNewSession("42",true)).isEqualTo(3L);

    verify(store).generationForNewSession("42",true);
  }

  @Test
  void deletesAllOtherSessionsUsingRepositoryApiAndToleratesRetry() {
    @SuppressWarnings("unchecked")
    FindByIndexNameSessionRepository<Session> repository = mock(
        FindByIndexNameSessionRepository.class);
    Session first = mock(Session.class);
    Session second = mock(Session.class);
    when(first.getId()).thenReturn("keep");
    when(second.getId()).thenReturn("remove");
    when(repository.findByPrincipalName("42")).thenReturn(Map.of("keep",first,"remove",second));

    new SessionIndexCleanup(repository).deleteAllExcept("42","keep");

    verify(repository).deleteById("remove");
  }

  @Test
  void remainsFailClosedWhenPhysicalSessionCleanupFails() {
    SessionGenerationStore store = mock(SessionGenerationStore.class);
    SessionIndexCleanup cleanup = mock(SessionIndexCleanup.class);
    SessionGenerationService service = new SessionGenerationService(store, cleanup);
    when(store.currentGeneration("42")).thenReturn(java.util.OptionalLong.of(2L));
    when(store.changeInProgress("42")).thenReturn(java.util.Optional.empty());
    doThrow(new IllegalStateException("delete-failure")).when(cleanup).deleteAllExcept("42",null);

    assertThatThrownBy(() -> service.verify("42",1L,"session-1"))
        .isInstanceOf(SessionGenerationValidationException.class);
  }
}
