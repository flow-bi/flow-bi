package com.flowbi.domain.auth.security;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class SecurityTestController {

  @GetMapping("/api/security-test/protected")
  String getProtected() {
    return "ok";
  }

  @PostMapping(path = "/api/security-test/protected", produces = MediaType.TEXT_PLAIN_VALUE)
  String updateProtected() {
    return "ok";
  }
}
