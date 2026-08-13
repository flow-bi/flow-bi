package com.flowbi.domain.auth.security;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/password-test")
class PasswordTestController {
  @GetMapping("/general")
  ResponseEntity<Void> general() {
    return ResponseEntity.ok().build();
  }
}
