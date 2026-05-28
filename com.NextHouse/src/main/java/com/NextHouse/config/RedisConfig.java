package com.NextHouse.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.*;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * RedisConfig
 *
 * Provides:
 *  1. LettuceConnectionFactory — pooled, non-blocking Redis connections.
 *  2. RedisTemplate<String, Object> — general-purpose key-value operations
 *     (used by RedisTokenStore, presence service, view counters, etc.).
 *  3. CacheManager — Spring @Cacheable integration with per-cache TTL config.
 *
 * Serialization:
 *   Keys   → StringRedisSerializer (human-readable in redis-cli)
 *   Values → GenericJackson2JsonRedisSerializer with JavaTimeModule
 *             (handles LocalDateTime, LocalDate correctly)
 *
 * Cache TTL configuration (customise in application.yml):
 * ─────────────────────────────────────────────────────────
 * app:
 *   cache:
 *     user-profile-ttl-minutes: 10
 *     post-ttl-minutes: 2
 *     community-ttl-minutes: 5
 *     trending-feed-ttl-minutes: 5
 * ─────────────────────────────────────────────────────────
 *
 * application.yml Redis config:
 * ─────────────────────────────────────────────────────────
 * spring:
 *   data:
 *     redis:
 *       host: ${REDIS_HOST:localhost}
 *       port: ${REDIS_PORT:6379}
 *       password: ${REDIS_PASSWORD:}
 *       timeout: 2000ms
 *       lettuce:
 *         pool:
 *           max-active: 20
 *           max-idle: 10
 *           min-idle: 2
 * ─────────────────────────────────────────────────────────
 */
@Configuration
@EnableCaching
public class RedisConfig {

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${spring.data.redis.password:}")
    private String redisPassword;

    // TTLs (minutes)
    @Value("${app.cache.user-profile-ttl-minutes:10}")
    private long userProfileTtl;

    @Value("${app.cache.post-ttl-minutes:2}")
    private long postTtl;

    @Value("${app.cache.community-ttl-minutes:5}")
    private long communityTtl;

    @Value("${app.cache.trending-feed-ttl-minutes:5}")
    private long trendingFeedTtl;

    // ─── Connection factory ───────────────────────────────────────────────────

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(redisHost);
        config.setPort(redisPort);
        if (redisPassword != null && !redisPassword.isBlank()) {
            config.setPassword(redisPassword);
        }
        return new LettuceConnectionFactory(config);
    }

    // ─── RedisTemplate ───────────────────────────────────────────────────────

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        StringRedisSerializer keySerializer = new StringRedisSerializer();
        template.setKeySerializer(keySerializer);
        template.setHashKeySerializer(keySerializer);

        GenericJackson2JsonRedisSerializer valueSerializer = new GenericJackson2JsonRedisSerializer(redisObjectMapper());
       // Jackson2JsonRedisSerializer<Object> cacheSerializer = new Jackson2JsonRedisSerializer<>(Object.class);
        template.setValueSerializer(valueSerializer);
        template.setHashValueSerializer(valueSerializer);

        template.afterPropertiesSet();
        return template;
    }

    // ─── CacheManager ────────────────────────────────────────────────────────

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory factory) {

        // Default config — applies to any cache not listed in perCacheTtl
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .serializeKeysWith(
                    RedisSerializationContext.SerializationPair.fromSerializer(
                        new StringRedisSerializer()))
                .serializeValuesWith(
                    RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer(redisObjectMapper())))
                .disableCachingNullValues();

        // Per-cache TTL overrides
        Map<String, RedisCacheConfiguration> perCacheTtl = new HashMap<>();
        perCacheTtl.put("user:profile",     defaultConfig.entryTtl(Duration.ofMinutes(userProfileTtl)));
        perCacheTtl.put("post",             defaultConfig.entryTtl(Duration.ofMinutes(postTtl)));
        perCacheTtl.put("community",        defaultConfig.entryTtl(Duration.ofMinutes(communityTtl)));
        perCacheTtl.put("feed:trending",    defaultConfig.entryTtl(Duration.ofMinutes(trendingFeedTtl)));
        perCacheTtl.put("neighborhood",     defaultConfig.entryTtl(Duration.ofHours(1)));

        return RedisCacheManager.builder(factory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(perCacheTtl)
                .build();
    }

    // ─── ObjectMapper for Redis ───────────────────────────────────────────────

    /**
     * ObjectMapper with:
     *   - JavaTimeModule: serializes/deserializes LocalDateTime, LocalDate, etc.
     *   - ActivateDefaultTyping: embeds @class field so deserialization knows
     *     the concrete type. Required for GenericJackson2JsonRedisSerializer.
     *
     * NOTE: Do NOT reuse the application's primary ObjectMapper bean here —
     *       the typing configuration would affect REST responses.
     */
    private ObjectMapper redisObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.activateDefaultTyping(
            LaissezFaireSubTypeValidator.instance,
            ObjectMapper.DefaultTyping.NON_FINAL,
            JsonTypeInfo.As.PROPERTY
        );
        return mapper;
    }
}
