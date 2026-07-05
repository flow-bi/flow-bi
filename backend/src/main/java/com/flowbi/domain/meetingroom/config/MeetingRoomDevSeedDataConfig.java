package com.flowbi.domain.meetingroom.config;

import com.flowbi.domain.meetingroom.entity.Room;
import com.flowbi.domain.meetingroom.repository.RoomRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(prefix = "flowbi.dev-seed", name = "enabled", havingValue = "true")
public class MeetingRoomDevSeedDataConfig {

  @Bean
  public CommandLineRunner seedDevRooms(RoomRepository roomRepository) {
    return args -> {
      if (roomRepository.count() > 0) {
        return;
      }

      roomRepository.saveAll(List.of(
          new Room("1회의실", 6L, "본관 3층 301호", "화이트보드, 모니터"),
          new Room("대회의실", 20L, "본관 5층 501호", "빔프로젝터, 화상회의"),
          new Room("집중회의실", 4L, "별관 2층 204호", "모니터")));
    };
  }
}
