package com.flowbi.domain.meetingroom.config;

import com.flowbi.domain.meetingroom.entity.Room;
import com.flowbi.domain.meetingroom.entity.RoomReservation;
import com.flowbi.domain.meetingroom.entity.ReservationStatus;
import com.flowbi.domain.meetingroom.repository.RoomRepository;
import com.flowbi.domain.meetingroom.repository.RoomReservationRepository;
import com.flowbi.domain.schedule.dto.ScheduleRequest;
import com.flowbi.domain.schedule.dto.ScheduleResponse;
import com.flowbi.domain.schedule.entity.ScheduleType;
import com.flowbi.domain.schedule.entity.ScheduleVisibility;
import com.flowbi.domain.schedule.service.ScheduleAutomationService;
import com.flowbi.domain.user.service.UserQueryService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@ConditionalOnProperty(prefix = "flowbi.dev-seed", name = "enabled", havingValue = "true")
public class MeetingRoomDevSeedDataConfig {

  @Bean
  @Order(20)
  public CommandLineRunner seedDevRooms(RoomRepository roomRepository,
      RoomReservationRepository reservationRepository,
      ScheduleAutomationService scheduleAutomationService,UserQueryService userQueryService,
      JdbcTemplate jdbcTemplate) {
    return args -> {
      seedTeams(jdbcTemplate);

      if (roomRepository.count() == 0) {
        roomRepository.saveAll(List.of(new Room("1회의실", 6L, "본관 3층 301호", "화이트보드, 모니터"),
            new Room("대회의실", 20L, "본관 5층 501호", "빔프로젝터, 화상회의"),
            new Room("집중회의실", 4L, "별관 2층 204호", "모니터")));
      }

      Long creatorId = userQueryService.findByEmployeeNumber("EMP001")
          .orElseThrow(() -> new IllegalStateException("dev seed user EMP001 is missing")).userId();
      List<Room> rooms = roomRepository.findAll();
      LocalDate today = LocalDate.now();
      if (reservationRepository.countByStartAtGreaterThanEqualAndStartAtLessThan(
          today.atStartOfDay(),today.plusDays(1).atStartOfDay()) > 0) {
        return;
      }

      seedReservation(reservationRepository,scheduleAutomationService,creatorId,rooms.get(0),
          "제품 요구사항 리뷰",today.atTime(9,0),today.atTime(10,0),4);
      seedReservation(reservationRepository,scheduleAutomationService,creatorId,rooms.get(1),
          "분기 전략 회의",today.atTime(13,0),today.atTime(15,0),12);
      seedReservation(reservationRepository,scheduleAutomationService,creatorId,rooms.get(2),
          "1:1 면담",today.atTime(16,0),today.atTime(17,0),2);
    };
  }

  private void seedTeams(JdbcTemplate jdbcTemplate) {
    insertTeamIfMissing(jdbcTemplate,10L,"플랫폼팀");
    insertTeamIfMissing(jdbcTemplate,20L,"프로덕트팀");
  }

  private void insertTeamIfMissing(JdbcTemplate jdbcTemplate,Long teamId,String teamName) {
    Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM teams WHERE team_id = ?",
        Integer.class,teamId);
    if (count != null && count == 0) {
      jdbcTemplate.update("INSERT INTO teams (team_id, team_name) VALUES (?, ?)",teamId,teamName);
    }
  }

  private void seedReservation(RoomReservationRepository reservationRepository,
      ScheduleAutomationService scheduleAutomationService,Long creatorId,Room room,String title,
      LocalDateTime startAt,LocalDateTime endAt,Integer count) {
    ScheduleResponse schedule = scheduleAutomationService.createForMeetingRoom(creatorId,
        new ScheduleRequest(title, ScheduleType.TEAM, ScheduleVisibility.PRIVATE, startAt, endAt,
            "파랑", room.getLocation(), "로컬 확인용 임시 예약", List.of()));
    reservationRepository.save(new RoomReservation(room.getRoomId(), schedule.scheduleId(), title,
        startAt, endAt, ReservationStatus.RESERVED, count, "로컬 확인용 임시 예약"));
  }
}
