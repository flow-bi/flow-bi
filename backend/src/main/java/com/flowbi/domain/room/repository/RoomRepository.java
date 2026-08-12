package com.flowbi.domain.room.repository;

import com.flowbi.domain.room.entity.Room;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, Long> {

  List<Room> findAllByOrderByIdAsc();

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select room from Room room where room.id = :roomId")
  Optional<Room> findByIdForUpdate(@Param("roomId") Long roomId);
}
