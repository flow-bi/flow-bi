package com.flowbi.domain.team.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;

@Entity
@Table(name = "teams_closure")
@Getter
public class TeamClosure {

  @EmbeddedId
  private TeamClosureId id;

  @MapsId("ancestorTeamId")
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "ancestor_team_id", nullable = false)
  private Team ancestorTeam;

  @MapsId("descendantTeamId")
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "descendant_team_id", nullable = false)
  private Team descendantTeam;

  @Column(nullable = false)
  private int depth;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected TeamClosure() {
  }

  private TeamClosure(Team ancestorTeam, Team descendantTeam, int depth) {
    if (ancestorTeam == null || descendantTeam == null) {
      throw new IllegalArgumentException("Closure 팀은 필수입니다.");
    }
    boolean selfRelationship = isSelfRelationship(ancestorTeam,descendantTeam);
    if ((selfRelationship && depth != 0) || (!selfRelationship && depth <= 0)) {
      throw new IllegalArgumentException("Closure depth가 유효하지 않습니다.");
    }
    this.id = new TeamClosureId(ancestorTeam.getTeamId(), descendantTeam.getTeamId());
    this.ancestorTeam = ancestorTeam;
    this.descendantTeam = descendantTeam;
    this.depth = depth;
  }

  public static TeamClosure create(Team ancestorTeam,Team descendantTeam,int depth) {
    return new TeamClosure(ancestorTeam, descendantTeam, depth);
  }

  private static boolean isSelfRelationship(Team ancestorTeam,Team descendantTeam) {
    return ancestorTeam == descendantTeam || (ancestorTeam.getTeamId() != null
        && ancestorTeam.getTeamId().equals(descendantTeam.getTeamId()));
  }

  @PrePersist
  protected void onCreate() {
    Instant now = Instant.now();
    if (createdAt == null) {
      createdAt = now;
    }
    if (updatedAt == null || updatedAt.isBefore(createdAt)) {
      updatedAt = createdAt;
    }
  }

  @PreUpdate
  protected void onUpdate() {
    Instant now = Instant.now();
    if (updatedAt == null || now.isAfter(updatedAt)) {
      updatedAt = now;
    }
  }
}
