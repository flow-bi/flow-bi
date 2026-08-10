package com.flowbi.domain.auth.security;

import java.util.Map;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class CsrfTokenController {

  @GetMapping("/csrf")
  Map<String, String> issueCsrfCookie(CsrfToken csrfToken) {
    csrfToken.getToken();
    return Map.of();
  }
}
