package com.NextHouse.scheduler;

import com.NextHouse.constant.ActivityStatus;
import com.NextHouse.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * ScheduledJobs
 *
 * All cron expressions use server UTC time.
 * Enable scheduling: @EnableScheduling on this class or a @Configuration.
 *
 * Job overview:
 * ┌─────────────────────────────────┬──────────────────┬────────────────────────────────────────┐
 * │ Job                             │ Frequency        │ Purpose                                │
 * ├─────────────────────────────────┼──────────────────┼────────────────────────────────────────┤
 * │ expireActivities                │ Every 15 min     │ Mark past activities EXPIRED           │
 * │ deleteExpiredOtps               │ Every 30 min     │ Purge used/expired OTP rows            │
 * │ deleteExpiredRefreshTokens      │ Daily 02:00 UTC  │ Purge revoked/expired refresh tokens   │
 * │ deleteStaleDeviceTokens         │ Daily 03:00 UTC  │ Remove FCM tokens unused for 30+ days  │
 * │ markStaleUsersOffline           │ Every 2 min      │ Mark users offline if WebSocket gone   │
 * └─────────────────────────────────┴──────────────────┴────────────────────────────────────────┘
 */
@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
public class ScheduledJobs {

    private final ActivityRepository    activityRepository;
    private final OtpVerificationRepository otpRepository;
    private final RefreshTokenRepository    refreshTokenRepository;
    private final DeviceTokenRepository     deviceTokenRepository;
    private final UserPresenceRepository    presenceRepository;

    // ─── Activity expiry ──────────────────────────────────────────────────────

    /**
     * Mark activities as EXPIRED when their endTime has passed.
     * Runs every 15 minutes. Atomic UPDATE — no entity loading.
     */
    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void expireActivities() {
        int count = activityRepository.expireActivities(LocalDateTime.now());
        if (count > 0) {
            log.info("[Scheduler] Expired {} activities", count);
        }
    }

    // ─── OTP cleanup ──────────────────────────────────────────────────────────

    /**
     * Delete OTP rows that are expired (expiresAt < now).
     * Runs every 30 minutes.
     */
    @Scheduled(cron = "0 */30 * * * *")
    @Transactional
    public void deleteExpiredOtps() {
        int count = otpRepository.deleteExpired(LocalDateTime.now());
        if (count > 0) {
            log.info("[Scheduler] Deleted {} expired OTP records", count);
        }
    }

    // ─── Refresh token cleanup ────────────────────────────────────────────────

    /**
     * Delete refresh tokens that are either expired or revoked.
     * Runs daily at 02:00 UTC.
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void deleteExpiredRefreshTokens() {
        int count = refreshTokenRepository.deleteExpiredAndRevoked(LocalDateTime.now());
        if (count > 0) {
            log.info("[Scheduler] Deleted {} expired/revoked refresh tokens", count);
        }
    }

    // ─── Device token cleanup ─────────────────────────────────────────────────

    /**
     * Remove FCM device tokens not used in the last 30 days.
     * Stale tokens cause FCM UNREGISTERED errors which degrade push delivery rates.
     * Runs daily at 03:00 UTC.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void deleteStaleDeviceTokens() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        int count = deviceTokenRepository.deleteStaleTokens(cutoff);
        if (count > 0) {
            log.info("[Scheduler] Deleted {} stale device tokens", count);
        }
    }

    // ─── Presence cleanup ─────────────────────────────────────────────────────

    /**
     * Mark users offline whose lastSeen is older than 3 minutes.
     * This handles cases where WebSocket disconnect events were missed
     * (e.g. network drop, server restart without graceful disconnect).
     * Runs every 2 minutes.
     */
    @Scheduled(cron = "0 */2 * * * *")
    @Transactional
    public void markStaleUsersOffline() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(3);
        int count = presenceRepository.markStaleUsersOffline(cutoff);
        if (count > 0) {
            log.debug("[Scheduler] Marked {} users offline (stale presence)", count);
        }
    }
}
