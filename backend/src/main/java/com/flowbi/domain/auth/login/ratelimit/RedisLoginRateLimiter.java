package com.flowbi.domain.auth.login.ratelimit;

import com.flowbi.domain.auth.login.ratelimit.LoginRateLimitUnavailableException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Component
class RedisLoginRateLimiter implements LoginRateLimiter {

  private static final String FAILURE_KEY_PREFIX = "flow-bi:auth:login-failures:";

  private static final String LOCK_KEY_PREFIX = "flow-bi:auth:login-lock:";

  private static final int MAX_FAILURES = 5;

  private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

  private static final DefaultRedisScript<Long> RECORD_FAILURE_SCRIPT = new DefaultRedisScript<>("""
      if redis.call('EXISTS', KEYS[2]) == 1 then
        return -1
      end

      local failureCount = redis.call('INCR', KEYS[1])

      if failureCount == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[2])
      end

      if failureCount >= tonumber(ARGV[1]) then
        redis.call('SET', KEYS[2], 'locked', 'EX', ARGV[2])
        redis.call('DEL', KEYS[1])
      end

      return failureCount
      """, Long.class);

  private final StringRedisTemplate redisTemplate;

  RedisLoginRateLimiter(StringRedisTemplate redisTemplate) {
    this.redisTemplate = redisTemplate;
  }

  @Override
  public boolean isLimited(String employeeNumber,String source) {
    validateArguments(employeeNumber,source);

    try {
      return Boolean.TRUE.equals(redisTemplate.hasKey(lockKey(employeeNumber,source)));
    } catch (DataAccessException exception) {
      throw new LoginRateLimitUnavailableException(exception);
    }
  }

  @Override
  public void recordFailure(String employeeNumber,String source) {
    validateArguments(employeeNumber,source);

    String failureKey = failureKey(employeeNumber,source);
    String lockKey = lockKey(employeeNumber,source);

    try {
      redisTemplate.execute(RECORD_FAILURE_SCRIPT,List.of(failureKey,lockKey),
          String.valueOf(MAX_FAILURES),String.valueOf(LOCK_DURATION.toSeconds()));
    } catch (DataAccessException exception) {
      throw new LoginRateLimitUnavailableException(exception);
    }
  }

  @Override
  public void reset(String employeeNumber,String source) {
    validateArguments(employeeNumber,source);

    try {
      redisTemplate
          .delete(List.of(failureKey(employeeNumber,source),lockKey(employeeNumber,source)));
    } catch (DataAccessException exception) {
      throw new LoginRateLimitUnavailableException(exception);
    }
  }

  private static String failureKey(String employeeNumber,String source) {
    return FAILURE_KEY_PREFIX + digest(employeeNumber) + ":" + digest(source);
  }

  private static String lockKey(String employeeNumber,String source) {
    return LOCK_KEY_PREFIX + digest(employeeNumber) + ":" + digest(source);
  }

  private static void validateArguments(String employeeNumber,String source) {
    if (employeeNumber == null || employeeNumber.isBlank()) {
      throw new IllegalArgumentException("사번은 필수입니다.");
    }

    if (source == null || source.isBlank()) {
      throw new IllegalArgumentException("로그인 요청 출처는 필수입니다.");
    }
  }

  private static String digest(String value) {
    try {
      MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");

      byte[] digest = messageDigest.digest(value.getBytes(StandardCharsets.UTF_8));

      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 알고리즘을 사용할 수 없습니다.", exception);
    }
  }
}
