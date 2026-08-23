package com.flowbi.domain.room.service;

import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.repository.PositionRepository;
import com.flowbi.domain.team.entity.Team;
import com.flowbi.domain.team.repository.TeamRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class RoomUserFixture {

  private RoomUserFixture() {
  }

  static List<Long> createActiveUsers(UserRepository users,PositionRepository positions,
      TeamRepository teams,int count) {
    Position position = positions.save(Position.create("Room test position"));
    Team team = teams.save(Team.create("Room test team"));
    List<Long> userIds = new ArrayList<>();
    for (int index = 0; index < count; index++) {
      String identifier = UUID.randomUUID().toString();
      User user = users.save(User.create("room-" + identifier,"room-" + identifier + "@test.dev",
          "Room user " + index,position,team));
      userIds.add(user.getUserId());
    }
    return List.copyOf(userIds);
  }

  static void deleteAll(UserRepository users,PositionRepository positions,TeamRepository teams) {
    users.deleteAll(users.findAll().stream()
        .filter(user -> user.getEmployeeNumber().startsWith("room-")).toList());
    users.flush();
    teams.deleteAll(teams.findAll().stream()
        .filter(team -> team.getTeamName().equals("Room test team")).toList());
    teams.flush();
    positions.deleteAll(positions.findAll().stream()
        .filter(position -> position.getPositionName().equals("Room test position")).toList());
    positions.flush();
  }
}
