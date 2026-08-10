package com.flowbi.domain.auth.persistence.repository;

import com.flowbi.domain.auth.persistence.entity.Team;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, Long> {

  Optional<Team> findByTeamName(String teamName);
}
