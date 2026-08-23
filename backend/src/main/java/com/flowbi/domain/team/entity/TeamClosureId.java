package com.flowbi.domain.team.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class TeamClosureId implements Serializable {

  @Column(name = "ancestor_team_id")
  private Long ancestorTeamId;

  @Column(name = "descendant_team_id")
  private Long descendantTeamId;

  protected TeamClosureId() {
  }

  public TeamClosureId(Long ancestorTeamId, Long descendantTeamId) {
    this.ancestorTeamId = ancestorTeamId;
    this.descendantTeamId = descendantTeamId;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof TeamClosureId that)) {
      return false;
    }
    return Objects.equals(ancestorTeamId,that.ancestorTeamId)
        && Objects.equals(descendantTeamId,that.descendantTeamId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(ancestorTeamId,descendantTeamId);
  }
}
