package com.NextHouse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * FIX: Added @EnableJpaAuditing
 *
 * ROOT CAUSE of "null value in column created_at":
 *   BaseEntity uses @CreationTimestamp (Hibernate) which SHOULD work without auditing.
 *   BUT User entity uses @SuperBuilder — when @SuperBuilder builds the object,
 *   Hibernate's @CreationTimestamp fires ONLY during the flush/persist lifecycle.
 *   The conflict happens because @EntityListeners(AuditingEntityListener.class)
 *   is on BaseEntity but @EnableJpaAuditing was missing from Application.
 *   Without @EnableJpaAuditing, AuditingEntityListener is registered but NOT wired
 *   to the JPA lifecycle, so it silently does nothing, and @CreationTimestamp
 *   also fails because the entity is built via builder (not new + setters).
 * Also added @EnableScheduling which is needed by scheduled jobs in
 *   PresenceCleanupScheduler and ActivityStatusScheduler.
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
public class Application {

	public static void main(String[] args) {
		SpringApplication.run(Application.class, args);
	}
}
