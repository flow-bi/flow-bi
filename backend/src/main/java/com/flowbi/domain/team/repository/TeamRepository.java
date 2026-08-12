package com.flowbi.domain.team.repository;

import com.flowbi.domain.team.entity.Team;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, Long> {

  Optional<Team> findByTeamName(String teamName);
}
