package com.flowbi.domain.auth.session;

import java.util.Optional;
import java.util.OptionalLong;

public interface SessionGenerationStore {
  // 사용자의 현재 세션 세대값을 조회
  OptionalLong findCurrentGeneration(String userId);
  // 비밀번호 변경 중 유지해야하는 세션 ID 조회
  Optional<String> findRetainedSessionId(String userId);
  // 새 세션에 넣을 세대 값 결정
  long resolveGenerationForNewSession(String userId,boolean hasExistingSessions);
  // 비밀 번호 변경하면서 세대 증가, 유지할 현재 세션 기록
  long beginPasswordChange(String userId,String retainedSessionId);
  // 비밀번호 변경 후 유지 세션 정보 정리
  void completePasswordChange(String userId);
}
