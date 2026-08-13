package com.flowbi.domain.auth.controller;

import com.flowbi.domain.auth.security.LoginPrincipal;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/session")
public class SessionStatusController {

  @GetMapping
  ResponseEntity<Map<String, Boolean>> currentSession(
      @AuthenticationPrincipal LoginPrincipal principal) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore())
        .body(Map.of("authenticated",true,"mustChangePassword",principal.mustChangePassword()));
  }
}
