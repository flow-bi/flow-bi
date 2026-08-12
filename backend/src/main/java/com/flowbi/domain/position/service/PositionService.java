package com.flowbi.domain.position.service;

import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.repository.PositionRepository;
import org.springframework.stereotype.Service;

@Service
public class PositionService {

  private final PositionRepository positions;

  public PositionService(PositionRepository positions) {
    this.positions = positions;
  }

  public Position findOrCreate(String positionName) {
    return positions.findByPositionName(positionName)
        .orElseGet(() -> positions.save(Position.create(positionName)));
  }
}
