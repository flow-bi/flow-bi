package com.flowbi.domain.auth.repository;

import com.flowbi.domain.auth.exception.LoginRateLimitUnavailableException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.List;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Component
class RedisLoginRateLimiter implements LoginRateLimiter {

  private static final int MAX_FAILURES = 5;
  private static final Duration WINDOW = Duration.ofMinutes(15);
  private static final DefaultRedisScript<Long> INCREMENT = new DefaultRedisScript<>(
      "local count=redis.call('INCR',KEYS[1]); if count == 1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return count;",
      Long.class);
  private final StringRedisTemplate redisTemplate;

  RedisLoginRateLimiter(StringRedisTemplate redisTemplate) {
    this.redisTemplate = redisTemplate;
  }

  @Override
  public boolean isLimited(String employeeNumber,String source) {
    try {
      String value = redisTemplate.opsForValue().get(key(employeeNumber,source));
      return value != null && Integer.parseInt(value) >= MAX_FAILURES;
    } catch (DataAccessException | NumberFormatException exception) {
      throw new LoginRateLimitUnavailableException(exception);
    }
  }

  @Override
  public void recordFailure(String employeeNumber,String source) {
    try {
      redisTemplate.execute(INCREMENT,List.of(key(employeeNumber,source)),
          String.valueOf(WINDOW.toSeconds()));
    } catch (DataAccessException exception) {
      throw new LoginRateLimitUnavailableException(exception);
    }
  }

  @Override
  public void reset(String employeeNumber,String source) {
    try {
      redisTemplate.delete(key(employeeNumber,source));
    } catch (DataAccessException exception) {
      throw new LoginRateLimitUnavailableException(exception);
    }
  }

  private String key(String employeeNumber,String source) {
    return "flow-bi:auth:login-failures:" + digest(employeeNumber) + ":" + digest(source);
  }

  private String digest(String value) {
    try {
      byte[] bytes = MessageDigest.getInstance("SHA-256")
          .digest(value.getBytes(StandardCharsets.UTF_8));
      StringBuilder encoded = new StringBuilder();
      for (byte valueByte : bytes) {
        encoded.append(String.format("%02x",valueByte));
      }
      return encoded.toString();
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
