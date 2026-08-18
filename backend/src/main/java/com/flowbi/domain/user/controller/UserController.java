package com.flowbi.domain.user.controller;

import com.flowbi.domain.user.dto.UserDetailResponse;
import com.flowbi.domain.user.service.UserService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserService users;

  public UserController(UserService users) {
    this.users = users;
  }

  @GetMapping("/{userId}")
  public ResponseEntity<UserDetailResponse> getUser(@PathVariable Long userId) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore())
        .body(users.getUserDetail(userId));
  }

  @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
  ResponseEntity<Void> notFound(org.springframework.web.server.ResponseStatusException exception) {
    return ResponseEntity.status(exception.getStatusCode()).cacheControl(CacheControl.noStore())
        .build();
  }
}
