package com.flowbi.domain.auth.persistence.repository;

import com.flowbi.domain.auth.persistence.entity.Position;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PositionRepository extends JpaRepository<Position, Long> {

  Optional<Position> findByPositionName(String positionName);
}
