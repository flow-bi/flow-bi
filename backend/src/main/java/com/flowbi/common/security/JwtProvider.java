package com.flowbi.common.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowbi.common.exception.BusinessException;
import com.flowbi.common.exception.ErrorCode;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

  private static final String HMAC_ALGORITHM = "HmacSHA256";
  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
  };

  private final JwtProperties properties;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  @Autowired
  public JwtProvider(JwtProperties properties, ObjectMapper objectMapper) {
    this(properties, objectMapper, Clock.systemUTC());
  }

  JwtProvider(JwtProperties properties, ObjectMapper objectMapper, Clock clock) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  public String createAccessToken(Long userId,String employeeNumber) {
    return createToken(userId,employeeNumber,JwtTokenType.ACCESS,
        properties.accessTokenTtl().toSeconds());
  }

  public String createRefreshToken(Long userId,String employeeNumber) {
    return createToken(userId,employeeNumber,JwtTokenType.REFRESH,
        properties.refreshTokenTtl().toSeconds());
  }

  public JwtClaims parse(String token,JwtTokenType expectedType) {
    Map<String, Object> payload = parseAndVerify(token);
    long expiresAt = toLong(payload.get("exp"));
    if (Instant.now(clock).getEpochSecond() >= expiresAt) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_EXPIRED, "만료된 토큰입니다.");
    }

    JwtTokenType tokenType = JwtTokenType.valueOf(String.valueOf(payload.get("typ")));
    if (tokenType != expectedType) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "요청한 용도와 다른 토큰입니다.");
    }

    return new JwtClaims(toLong(payload.get("sub")), String.valueOf(payload.get("employee_number")),
        tokenType);
  }

  public Long readUserIdWithoutExpirationCheck(String token) {
    Map<String, Object> payload = parseAndVerify(token);
    return toLong(payload.get("sub"));
  }

  private String createToken(Long userId,String employeeNumber,JwtTokenType tokenType,
      long ttlSeconds) {
    Map<String, Object> header = new LinkedHashMap<>();
    header.put("alg","HS256");
    header.put("typ","JWT");

    Instant now = Instant.now(clock);
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("sub",userId);
    payload.put("employee_number",employeeNumber);
    payload.put("typ",tokenType.name());
    payload.put("iat",now.getEpochSecond());
    payload.put("exp",now.plusSeconds(ttlSeconds).getEpochSecond());
    payload.put("jti",UUID.randomUUID().toString());

    String unsignedToken = base64Url(toJson(header)) + "." + base64Url(toJson(payload));
    return unsignedToken + "." + sign(unsignedToken);
  }

  private Map<String, Object> parseAndVerify(String token) {
    String[] parts = token == null ? new String[0] : token.split("\\.");
    if (parts.length != 3) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "토큰 형식이 올바르지 않습니다.");
    }

    String unsignedToken = parts[0] + "." + parts[1];
    if (!constantTimeEquals(sign(unsignedToken),parts[2])) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "토큰 서명이 올바르지 않습니다.");
    }

    try {
      byte[] payload = Base64.getUrlDecoder().decode(parts[1]);
      return objectMapper.readValue(payload,MAP_TYPE);
    } catch (IllegalArgumentException | IOException exception) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "토큰 본문을 읽을 수 없습니다.");
    }
  }

  private String toJson(Map<String, Object> value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("JWT JSON 직렬화에 실패했습니다.", exception);
    }
  }

  private String sign(String value) {
    try {
      Mac mac = Mac.getInstance(HMAC_ALGORITHM);
      mac.init(
          new SecretKeySpec(properties.secret().getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
      return Base64.getUrlEncoder().withoutPadding()
          .encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) {
      throw new IllegalStateException("JWT 서명 생성에 실패했습니다.", exception);
    }
  }

  private String base64Url(String value) {
    return Base64.getUrlEncoder().withoutPadding()
        .encodeToString(value.getBytes(StandardCharsets.UTF_8));
  }

  private long toLong(Object value) {
    if (value instanceof Number number) {
      return number.longValue();
    }
    return Long.parseLong(String.valueOf(value));
  }

  private boolean constantTimeEquals(String expected,String actual) {
    return MessageDigestUtil.constantTimeEquals(expected.getBytes(StandardCharsets.UTF_8),
        actual.getBytes(StandardCharsets.UTF_8));
  }
}
