package com.flowbi.domain.auth.session;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Component
public class RedisSessionGenerationStore implements SessionGenerationStore {

  private static final Duration STATE_TTL = Duration.ofHours(24);
  private static final String GENERATION_KEY_PREFIX = "flow-bi:auth:session-generation:";
  private static final String CHANGE_KEY_PREFIX = "flow-bi:auth:session-change:";
  private static final DefaultRedisScript<Long> LOGIN_GENERATION_SCRIPT = new DefaultRedisScript<>(
      "if redis.call('EXISTS',KEYS[2]) == 1 then return -2; end; "
          + "local value=redis.call('GET',KEYS[1]); "
          + "if value then return tonumber(value); end; "
          + "if ARGV[1] == '1' then return -1; end; "
          + "redis.call('SET',KEYS[1],'0','EX',ARGV[2]); return 0;",
      Long.class);
  private static final DefaultRedisScript<Long> BEGIN_CHANGE_SCRIPT = new DefaultRedisScript<>(
      "if redis.call('EXISTS',KEYS[1]) == 0 then return -1; end; "
          + "local value=redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],ARGV[2]); "
          + "redis.call('SET',KEYS[2],ARGV[1],'EX',ARGV[2]); return value;",
      Long.class);

  private final StringRedisTemplate redisTemplate;

  public RedisSessionGenerationStore(StringRedisTemplate redisTemplate) {
    this.redisTemplate = redisTemplate;
  }

  @Override
  public OptionalLong currentGeneration(String userId) {
    try {
      String value = redisTemplate.opsForValue().get(generationKey(userId));
      return value == null ? OptionalLong.empty() : OptionalLong.of(Long.parseLong(value));
    } catch (DataAccessException | NumberFormatException exception) {
      throw unavailable(exception);
    }
  }

  @Override
  public Optional<String> changeInProgress(String userId) {
    try {
      return Optional.ofNullable(redisTemplate.opsForValue().get(changeKey(userId)));
    } catch (DataAccessException exception) {
      throw unavailable(exception);
    }
  }

  @Override
  public long generationForNewSession(String userId,boolean hasExistingSessions) {
    try {
      Long generation = redisTemplate.execute(LOGIN_GENERATION_SCRIPT,
          List.of(generationKey(userId),changeKey(userId)),hasExistingSessions ? "1" : "0",
          String.valueOf(STATE_TTL.toSeconds()));
      if (generation == null || generation < 0) {
        throw new SessionGenerationStoreUnavailableException(
            "Session generation state is unavailable", null);
      }
      return generation;
    } catch (DataAccessException exception) {
      throw unavailable(exception);
    }
  }

  @Override
  public long beginChange(String userId,String retainedSessionId) {
    try {
      Long generation = redisTemplate.execute(BEGIN_CHANGE_SCRIPT,
          List.of(generationKey(userId),changeKey(userId)),retainedSessionId,
          String.valueOf(STATE_TTL.toSeconds()));
      if (generation == null || generation < 0) {
        throw new SessionGenerationStoreUnavailableException(
            "Session generation state is unavailable", null);
      }
      return generation;
    } catch (DataAccessException exception) {
      throw unavailable(exception);
    }
  }

  @Override
  public void completeChange(String userId) {
    try {
      redisTemplate.delete(changeKey(userId));
    } catch (DataAccessException exception) {
      throw unavailable(exception);
    }
  }

  private String generationKey(String userId) {
    return GENERATION_KEY_PREFIX + userId;
  }

  private String changeKey(String userId) {
    return CHANGE_KEY_PREFIX + userId;
  }

  private SessionGenerationStoreUnavailableException unavailable(Exception cause) {
    return new SessionGenerationStoreUnavailableException("Session generation state is unavailable",
        cause);
  }
}
