package com.flowbi.domain.auth.login.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

class RedisLoginRateLimiterTest {

  private static final String EMPLOYEE_NUMBER = "E100";
  private static final String SOURCE = "203.0.113.7";

  @Test
  void hashesIdentifiersAndStartsTheFifteenMinuteWindowOnTheFirstFailure() {
    StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
    RedisLoginRateLimiter limiter = new RedisLoginRateLimiter(redisTemplate);
    ArgumentCaptor<DefaultRedisScript<Long>> script = ArgumentCaptor
        .forClass(DefaultRedisScript.class);
    ArgumentCaptor<List<String>> keys = ArgumentCaptor.forClass(List.class);

    limiter.recordFailure(EMPLOYEE_NUMBER,SOURCE);

    verify(redisTemplate).execute(script.capture(),keys.capture(),eq("5"),eq("900"));
    assertThat(keys.getValue()).allSatisfy(key -> {
      assertThat(key).doesNotContain(EMPLOYEE_NUMBER).doesNotContain(SOURCE);
    });
    assertThat(script.getValue().getScriptAsString()).contains("INCR","failureCount == 1","EXPIRE",
        "SET","DEL");
  }

  @Test
  void checksAndClearsBothHashedFailureAndLockState() {
    StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
    RedisLoginRateLimiter limiter = new RedisLoginRateLimiter(redisTemplate);
    when(redisTemplate.hasKey(any())).thenReturn(true);

    assertThat(limiter.isLimited(EMPLOYEE_NUMBER,SOURCE)).isTrue();
    limiter.reset(EMPLOYEE_NUMBER,SOURCE);

    ArgumentCaptor<String> lockKey = ArgumentCaptor.forClass(String.class);
    verify(redisTemplate).hasKey(lockKey.capture());
    assertThat(lockKey.getValue()).doesNotContain(EMPLOYEE_NUMBER).doesNotContain(SOURCE);
    verify(redisTemplate).delete(any(List.class));
  }

  @Test
  void failsClosedWhenRedisIsUnavailable() {
    StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
    when(redisTemplate.hasKey(any()))
        .thenThrow(new DataAccessResourceFailureException("redis unavailable"));
    RedisLoginRateLimiter limiter = new RedisLoginRateLimiter(redisTemplate);

    assertThatThrownBy(() -> limiter.isLimited(EMPLOYEE_NUMBER,SOURCE))
        .isInstanceOf(LoginRateLimitUnavailableException.class);
  }
}
