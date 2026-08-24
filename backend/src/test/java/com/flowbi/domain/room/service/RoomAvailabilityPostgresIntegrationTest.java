package com.flowbi.domain.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;

import com.flowbi.domain.room.dto.RoomAvailabilityQuery;
import com.flowbi.domain.room.dto.RoomAvailabilityResponse.RoomSummary;
import com.flowbi.domain.room.entity.Room;
import com.flowbi.domain.room.repository.RoomRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {"spring.datasource.driver-class-name=org.postgresql.Driver",
    "spring.jpa.hibernate.ddl-auto=validate",
    "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect"})
class RoomAvailabilityPostgresIntegrationTest {

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url",POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username",POSTGRES::getUsername);
    registry.add("spring.datasource.password",POSTGRES::getPassword);
  }

  @Autowired
  private RoomRepository roomRepository;

  @Autowired
  private RoomAvailabilityService roomAvailabilityService;

  @Test
  void returnsMigratedRoomsThroughRepositoryAndAvailabilityService() {
    List<Room> persistedRooms = roomRepository.findAllByOrderByIdAsc();

    assertThat(persistedRooms)
        .extracting(Room::getId,Room::getName,Room::getCapacity,Room::getLocation).containsExactly(
            tuple(1L,"한강 회의실",8L,"3층"),tuple(2L,"남산 회의실",4L,"2층"),tuple(3L,"북한산 회의실",12L,"4층"));

    List<RoomSummary> rooms = roomAvailabilityService
        .findAvailability(RoomAvailabilityQuery.forDate(LocalDate.of(2026,8,21))).rooms();

    assertThat(rooms)
        .extracting(RoomSummary::id,RoomSummary::name,RoomSummary::capacity,RoomSummary::location)
        .containsExactly(tuple(1L,"한강 회의실",8L,"3층"),tuple(2L,"남산 회의실",4L,"2층"),
            tuple(3L,"북한산 회의실",12L,"4층"));
    assertThat(rooms).allSatisfy(room -> {
      assertThat(room.reservations()).isEmpty();
      assertThat(room.usesDefaultImage()).isTrue();
    });
  }
}
