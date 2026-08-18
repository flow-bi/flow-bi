package com.flowbi.domain.user.entity;

import com.flowbi.domain.position.entity.Position;
import com.flowbi.domain.team.entity.Team;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.regex.Pattern;
import lombok.Getter;

@Entity
@Table(name = "users")
@Getter
public class User {

  static final int EMPLOYEE_NUMBER_MAX_LENGTH = 50;
  static final int EMAIL_MAX_LENGTH = 255;
  static final int NAME_MAX_LENGTH = 50;
  static final int PHONE_NUMBER_MAX_LENGTH = 20;
  static final int PROFILE_IMAGE_URL_MAX_LENGTH = 512;

  private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "user_id")
  private Long userId;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "position_id", nullable = false)
  private Position position;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "team_id", nullable = false)
  private Team team;

  @Column(nullable = false, unique = true, length = EMAIL_MAX_LENGTH)
  private String email;

  @Column(name = "employee_number", nullable = false, unique = true, length = EMPLOYEE_NUMBER_MAX_LENGTH)
  private String employeeNumber;

  @Column(nullable = false, length = NAME_MAX_LENGTH)
  private String name;

  @Column(name = "phone_number", length = PHONE_NUMBER_MAX_LENGTH)
  private String phoneNumber;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private UserStatus status;

  @Column(name = "profile_image_url", length = PROFILE_IMAGE_URL_MAX_LENGTH)
  private String profileImageUrl;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected User() {
  }

  private User(String employeeNumber, String email, String name, Position position, Team team) {
    this.employeeNumber = validateEmployeeNumber(employeeNumber);
    this.email = validateEmail(email);
    this.name = validateName(name);
    this.position = requirePosition(position);
    this.team = requireTeam(team);
    this.status = UserStatus.ACTIVE;
  }

  public static User create(String employeeNumber,String email,String name,Position position,
      Team team) {
    return new User(employeeNumber, email, name, position, team);
  }

  public void changeEmail(String email) {
    this.email = validateEmail(email);
  }

  public void changePhoneNumber(String phoneNumber) {
    this.phoneNumber = normalizeOptional(phoneNumber,PHONE_NUMBER_MAX_LENGTH,"전화번호");
  }

  public void changeTeam(Team team) {
    this.team = requireTeam(team);
  }

  public void changePosition(Position position) {
    this.position = requirePosition(position);
  }

  public void activate() {
    this.status = UserStatus.ACTIVE;
  }

  public void deactivate() {
    this.status = UserStatus.INACTIVE;
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

  private static String validateEmployeeNumber(String employeeNumber) {
    return normalizeRequired(employeeNumber,EMPLOYEE_NUMBER_MAX_LENGTH,"사번");
  }

  private static String validateEmail(String email) {
    String normalized = normalizeRequired(email,EMAIL_MAX_LENGTH,"이메일");
    if (!EMAIL_PATTERN.matcher(normalized).matches()) {
      throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다.");
    }
    return normalized;
  }

  private static String validateName(String name) {
    return normalizeRequired(name,NAME_MAX_LENGTH,"이름");
  }

  private static Team requireTeam(Team team) {
    if (team == null) {
      throw new IllegalArgumentException("팀은 필수입니다.");
    }
    return team;
  }

  private static Position requirePosition(Position position) {
    if (position == null) {
      throw new IllegalArgumentException("직급은 필수입니다.");
    }
    return position;
  }

  private static String normalizeRequired(String value,int maxLength,String fieldName) {
    String normalized = normalize(value,fieldName);
    if (normalized.isEmpty()) {
      throw new IllegalArgumentException(fieldName + "은 필수입니다.");
    }
    validateMaximumLength(normalized,maxLength,fieldName);
    return normalized;
  }

  private static String normalizeOptional(String value,int maxLength,String fieldName) {
    if (value == null) {
      return null;
    }
    String normalized = normalize(value,fieldName);
    if (normalized.isEmpty()) {
      return null;
    }
    validateMaximumLength(normalized,maxLength,fieldName);
    return normalized;
  }

  private static String normalize(String value,String fieldName) {
    if (value == null) {
      throw new IllegalArgumentException(fieldName + "은 필수입니다.");
    }
    String normalized = value.strip();
    if (containsControlCharacter(normalized)) {
      throw new IllegalArgumentException(fieldName + "에 제어문자를 포함할 수 없습니다.");
    }
    return normalized;
  }

  private static void validateMaximumLength(String value,int maxLength,String fieldName) {
    if (value.length() > maxLength) {
      throw new IllegalArgumentException(fieldName + "은 " + maxLength + "자 이하여야 합니다.");
    }
  }

  private static boolean containsControlCharacter(String value) {
    return value.chars().anyMatch(character -> Character.isISOControl(character));
  }
}
