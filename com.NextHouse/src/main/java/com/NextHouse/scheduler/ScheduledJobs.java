package com.NextHouse.scheduler;

import com.NextHouse.constant.ActivityStatus;
import com.NextHouse.entity.Activity;
import com.NextHouse.repository.*;
import com.NextHouse.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

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
 * │ expireOldStories                │ Every hour       │ Soft-delete stories past their 24hr TTL│
 * │ markStaleUsersOffline           │ Every 2 min      │ Mark users offline if WebSocket gone   │
 * └─────────────────────────────────┴──────────────────┴────────────────────────────────────────┘
 */
@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
public class ScheduledJobs {

    private final ActivityRepository        activityRepository;
    private final ActivityMemberRepository  activityMemberRepository;
    private final NotificationService       notificationService;
    private final OtpVerificationRepository otpRepository;
    private final RefreshTokenRepository    refreshTokenRepository;
    private final DeviceTokenRepository     deviceTokenRepository;
    private final UserPresenceRepository    presenceRepository;
    private final StoryRepository           storyRepository;

    // ─── Activity reminders ───────────────────────────────────────────────────

    /**
     * Send "starting in ~1 hour" reminders to approved members of upcoming activities.
     * Runs every 5 minutes. Checks activities starting in [55, 60] minutes.
     * reminder_sent flag prevents double-dispatch.
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void sendActivityReminders() {
        LocalDateTime from = LocalDateTime.now().plusMinutes(55);
        LocalDateTime to   = LocalDateTime.now().plusMinutes(60);
        List<Activity> activities = activityRepository.findActivitiesNeedingReminder(from, to);
        if (activities.isEmpty()) return;

        for (Activity activity : activities) {
            List<Long> memberIds = activityMemberRepository.findApprovedMemberUserIds(activity.getId());
            for (Long userId : memberIds) {
                notificationService.notifyActivityReminder(userId, activity.getId(), activity.getTitle());
            }
            // Also remind the host
            notificationService.notifyActivityReminder(
                activity.getHostUser().getId(), activity.getId(), activity.getTitle());
        }

        List<Long> ids = activities.stream().map(Activity::getId).toList();
        activityRepository.markRemindersSent(ids);
        log.info("[Scheduler] Sent activity reminders for {} activities", activities.size());
    }

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

    // ─── Story expiry ─────────────────────────────────────────────────────────

    /**
     * Soft-delete stories whose expiresAt has passed (typically 24-hour stories).
     * Runs every hour. The StoryRepository query excludes already-deleted stories
     * so this is safe to run repeatedly.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void expireOldStories() {
        int count = storyRepository.expireOldStories(LocalDateTime.now());
        if (count > 0) {
            log.info("[Scheduler] Expired {} stories", count);
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
