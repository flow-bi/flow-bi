package com.flowbi.domain.auth.fixture;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth.test-fixtures")
public class SyntheticAuthFixtureProperties extends TestFixtureProperties {
}
