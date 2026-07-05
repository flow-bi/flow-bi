package com.flowbi.common.config;

import com.flowbi.domain.auth.entity.UserCredential;
import com.flowbi.domain.auth.repository.UserCredentialRepository;
import com.flowbi.domain.user.entity.User;
import com.flowbi.domain.user.repository.UserRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@ConditionalOnProperty(prefix = "flowbi.dev-seed", name = "enabled", havingValue = "true")
public class DevSeedDataConfig {

  @Bean
  public CommandLineRunner seedDevUsers(UserRepository userRepository,
      UserCredentialRepository credentialRepository,PasswordEncoder passwordEncoder) {
    return args -> {
      if (userRepository.findByEmployeeNumber("EMP001").isPresent()) {
        return;
      }

      List<User> users = List.of(new User(1L, 10L, "EMP001", "홍길동"),
          new User(2L, 10L, "EMP002", "김민지"),new User(3L, 20L, "EMP003", "이서준"));

      userRepository.saveAll(users).forEach(user -> credentialRepository
          .save(new UserCredential(user.getUserId(), passwordEncoder.encode("password123"))));
    };
  }
}
