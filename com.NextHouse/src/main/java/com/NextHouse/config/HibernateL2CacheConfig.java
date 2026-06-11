package com.NextHouse.config;

import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.cache.CacheManager;
import javax.cache.Caching;
import javax.cache.spi.CachingProvider;
import java.net.URI;

/**
 * Wires Ehcache 3 as the JCache provider for Hibernate L2 cache.
 *
 * Uses HibernatePropertiesCustomizer (not Spring's CacheManager) to avoid
 * conflicting with the Redis CacheManager used for @Cacheable.
 *
 * Cache regions are defined in src/main/resources/ehcache.xml.
 * Entities must be annotated with @Cache(usage = CacheConcurrencyStrategy.READ_WRITE).
 */
@Configuration
public class HibernateL2CacheConfig {

    @Bean
    public HibernatePropertiesCustomizer hibernateL2CacheCustomizer() {
        return hibernateProperties -> {
            try {
                URI configUri = getClass().getResource("/ehcache.xml").toURI();
                CachingProvider provider = Caching.getCachingProvider(
                        "org.ehcache.jsr107.EhcacheCachingProvider");
                CacheManager cacheManager = provider.getCacheManager(
                        configUri, getClass().getClassLoader());
                hibernateProperties.put("hibernate.javax.cache.cache_manager", cacheManager);
            } catch (Exception e) {
                throw new IllegalStateException("Failed to initialise Ehcache L2 cache", e);
            }
        };
    }
}
