package com.flowbi.domain.meetingroom.repository;

import com.flowbi.domain.meetingroom.entity.Room;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomRepository extends JpaRepository<Room, Long> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select room from Room room where room.roomId = :roomId")
  Optional<Room> findByIdForUpdate(@Param("roomId") Long roomId);

  @Query("""
      select room
      from Room room
      order by
        case when :capacity is null then 0
          when room.capacity >= :capacity then 0 else 1 end,
        room.capacity asc,
        room.roomName asc
      """)
  List<Room> findPrioritized(@Param("capacity") Long capacity);
}
