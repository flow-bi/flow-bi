package com.flowbi.domain.auth.repository;

import com.flowbi.domain.auth.entity.UserToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserTokenRepository extends JpaRepository<UserToken, Long> {

  Optional<UserToken> findByRefreshToken(String refreshToken);

  Optional<UserToken> findFirstByUserIdAndDeviceInfo(Long userId,String deviceInfo);

  void deleteByRefreshToken(String refreshToken);

  void deleteByUserId(Long userId);
}
