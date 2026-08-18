package com.flowbi.domain.position.service;

import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.position.repository.PositionRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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

  public Position findExisting(Long positionId) {
    return positions.findById(positionId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
  }

  public List<Position> findAll() {
    return positions.findAll();
  }
}
