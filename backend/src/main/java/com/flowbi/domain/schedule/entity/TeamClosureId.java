package com.flowbi.domain.schedule.entity;

import java.io.Serializable;
import java.util.Objects;

public class TeamClosureId implements Serializable {

  private Long ancestorTeamId;
  private Long descendantTeamId;

  protected TeamClosureId() {
  }

  public TeamClosureId(Long ancestorTeamId, Long descendantTeamId) {
    this.ancestorTeamId = ancestorTeamId;
    this.descendantTeamId = descendantTeamId;
  }

  @Override
  public boolean equals(Object object) {
    if (this == object) {
      return true;
    }
    if (!(object instanceof TeamClosureId that)) {
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
