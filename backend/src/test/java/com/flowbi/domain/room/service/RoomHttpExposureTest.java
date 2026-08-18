package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

@SpringBootTest
class RoomHttpExposureTest {

  @Autowired
  private RequestMappingHandlerMapping requestMappingHandlerMapping;

  @Test
  void doesNotExposeRoomHttpEndpointsBeforeAuthenticationIsImplemented() {
    ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(
        false);
    scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

    assertThat(scanner.findCandidateComponents("com.flowbi.domain.room")).isEmpty();
    assertThat(requestMappingHandlerMapping.getHandlerMethods().keySet().stream()
        .flatMap(mapping -> mapping.getPatternValues().stream())).noneMatch(
            path -> path.startsWith("/api/rooms") || path.startsWith("/api/room-reservations"));
  }
}
