package com.flowbi.domain.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowbi.domain.auth.password.MustChangePasswordFilter;
import com.flowbi.domain.auth.session.AbsoluteSessionTimeoutFilter;
import com.flowbi.domain.auth.session.LogoutHandler;
import com.flowbi.domain.auth.session.LogoutSuccessHandler;
import com.flowbi.domain.auth.session.SessionGenerationValidationFilter;
import com.flowbi.domain.auth.session.AbsoluteSessionTimeoutFilter;
import com.flowbi.domain.auth.session.LogoutHandler;
import com.flowbi.domain.auth.session.LogoutSuccessHandler;
import com.flowbi.domain.auth.session.SessionGenerationValidationFilter;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(AuthSecurityProperties.class)
public class SecurityConfiguration {

  private static final String CSRF_COOKIE_NAME = "XSRF-TOKEN";
  private static final String CSRF_HEADER_NAME = "X-XSRF-TOKEN";

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http,ObjectMapper objectMapper,
      AbsoluteSessionTimeoutFilter absoluteSessionTimeoutFilter,
      ObjectProvider<SessionGenerationValidationFilter> sessionGenerationValidationFilter,
      ObjectProvider<MustChangePasswordFilter> mustChangePasswordFilter,
      ObjectProvider<LogoutHandler> logoutHandlerProvider,
      ObjectProvider<LogoutSuccessHandler> logoutSuccessHandlerProvider) throws Exception {

    CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
    csrfTokenRepository.setCookieName(CSRF_COOKIE_NAME);
    csrfTokenRepository.setHeaderName(CSRF_HEADER_NAME);
    csrfTokenRepository.setCookiePath("/");

    CsrfTokenRequestAttributeHandler csrfRequestHandler = new CsrfTokenRequestAttributeHandler();
    csrfRequestHandler.setCsrfRequestAttributeName("_csrf");

    http.csrf(csrf -> csrf
        .csrfTokenRepository(csrfTokenRepository).csrfTokenRequestHandler(csrfRequestHandler))
        .cors(Customizer.withDefaults())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .sessionFixation(fixation -> fixation.changeSessionId()))
        .authorizeHttpRequests(authorize -> authorize
            .requestMatchers(HttpMethod.POST,"/api/auth/login","/api/dev/auth/employee-accounts")
            .permitAll()

            .requestMatchers(HttpMethod.GET,"/api/auth/csrf",
                "/api/dev/auth/employee-account-options")
            .permitAll().anyRequest().authenticated())

        .exceptionHandling(exception -> exception
            .authenticationEntryPoint(new JsonAuthenticationEntryPoint(objectMapper))
            .accessDeniedHandler(new JsonAccessDeniedHandler(objectMapper)))
        .addFilterAfter(absoluteSessionTimeoutFilter,
            org.springframework.security.web.context.SecurityContextHolderFilter.class);

    LogoutHandler logoutHandler = logoutHandlerProvider.getIfAvailable();
    LogoutSuccessHandler logoutSuccessHandler = logoutSuccessHandlerProvider.getIfAvailable();
    if (logoutHandler != null && logoutSuccessHandler != null) {
      http.logout(logout -> logout.logoutUrl("/api/auth/logout").invalidateHttpSession(false)
          .addLogoutHandler(logoutHandler).logoutSuccessHandler(logoutSuccessHandler).permitAll());
    }

    SessionGenerationValidationFilter generationFilter = sessionGenerationValidationFilter
        .getIfAvailable();
    if (generationFilter != null) {
      http.addFilterAfter(generationFilter,
          org.springframework.security.web.context.SecurityContextHolderFilter.class);
    }

    MustChangePasswordFilter passwordFilter = mustChangePasswordFilter.getIfAvailable();
    if (passwordFilter != null) {
      http.addFilterAfter(passwordFilter,
          org.springframework.security.web.context.SecurityContextHolderFilter.class);
    }

    return http.build();
  }

  @Bean
  DefaultCookieSerializer cookieSerializer(AuthSecurityProperties properties) {
    DefaultCookieSerializer serializer = new DefaultCookieSerializer();
    serializer.setCookieName("SESSION");
    serializer.setCookiePath("/");
    serializer.setUseHttpOnlyCookie(true);
    serializer.setUseSecureCookie(properties.getSession().isSecureCookie());
    serializer.setSameSite("Lax");
    return serializer;
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(AuthSecurityProperties properties) {
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    List<String> allowedOrigins = properties.getCors().getAllowedOrigins();
    if (!allowedOrigins.isEmpty() && !allowedOrigins.get(0).isBlank()) {
      CorsConfiguration configuration = new CorsConfiguration();
      configuration.setAllowedOrigins(allowedOrigins);
      configuration.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE"));
      configuration.setAllowedHeaders(List.of("Content-Type",CSRF_HEADER_NAME));
      configuration.setAllowCredentials(true);
      source.registerCorsConfiguration("/api/**",configuration);
    }
    return source;
  }
}
