package com.flowbi.global.config;

import org.springframework.boot.info.BuildProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class OpenApiConfig {

  @Bean
  OpenAPI flowBiOpenApi(BuildProperties buildProperties) {
    return new OpenAPI()
        .info(new Info().title("Flow BI API").version(buildProperties.getVersion()));
  }
}
