package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.flowbi.test.H2SpringBootTest;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

@H2SpringBootTest
class RoomHttpExposureTest {

  @Autowired
  private RequestMappingHandlerMapping requestMappingHandlerMapping;

  @Test
  void exposesTheAuthenticatedRoomHttpEndpointsThroughTheRoomController() {
    ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(
        false);
    scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

    assertThat(scanner.findCandidateComponents("com.flowbi.domain.room"))
        .extracting(definition -> definition.getBeanClassName())
        .containsExactly("com.flowbi.domain.room.controller.RoomController");
    assertThat(requestMappingHandlerMapping.getHandlerMethods().keySet().stream()
        .flatMap(mapping -> mapping.getPatternValues().stream()))
        .anyMatch(path -> path.startsWith("/api/rooms"))
        .anyMatch(path -> path.startsWith("/api/room-reservations"));
  }
}
