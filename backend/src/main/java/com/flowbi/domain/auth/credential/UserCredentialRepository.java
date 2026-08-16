package com.flowbi.domain.auth.credential;

import com.flowbi.domain.auth.credential.UserCredential;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserCredentialRepository extends JpaRepository<UserCredential, Long> {

  Optional<UserCredential> findByUserUserId(Long userId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select credential from UserCredential credential where credential.user.userId = :userId")
  Optional<UserCredential> findByUserUserIdForUpdate(@Param("userId") Long userId);
}
