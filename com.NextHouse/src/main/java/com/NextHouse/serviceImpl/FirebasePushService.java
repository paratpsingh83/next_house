package com.NextHouse.serviceImpl;

import com.NextHouse.entity.DeviceToken;
import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * FirebasePushService
 *
 * Wraps Firebase Admin SDK's FirebaseMessaging for push notification delivery.
 *
 * Setup requirements (application.yml):
 * ──────────────────────────────────────────────────────────────
 * firebase:
 *   credentials-file: classpath:firebase-service-account.json
 *   project-id: your-firebase-project-id
 * ──────────────────────────────────────────────────────────────
 *
 * Maven dependency:
 *   <dependency>
 *     <groupId>com.google.firebase</groupId>
 *     <artifactId>firebase-admin</artifactId>
 *     <version>9.2.0</version>
 *   </dependency>
 *
 * FirebaseApp is initialised in FirebaseConfig:
 *   @Bean FirebaseApp firebaseApp() {
 *     GoogleCredentials creds = GoogleCredentials.fromStream(credFile.getInputStream());
 *     FirebaseOptions options = FirebaseOptions.builder().setCredentials(creds).build();
 *     return FirebaseApp.initializeApp(options);
 *   }
 *
 * Batch strategy:
 *   FCM allows up to 500 tokens per sendEachForMulticast() call.
 *   This service batches into chunks of 500 to respect that limit.
 *
 * Stale token cleanup:
 *   On UNREGISTERED error codes, the token is soft-deleted from device_tokens.
 *   DeviceTokenRepository.deleteStaleTokens() also runs on a nightly schedule.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FirebasePushService {

    private static final int FCM_BATCH_SIZE = 500;

    private final FirebaseMessaging      firebaseMessaging;
    private final com.NextHouse.repository.DeviceTokenRepository deviceTokenRepository;

    /**
     * Send a push notification to all given device tokens.
     * Automatically batches if tokens.size() > 500.
     */
    public void sendPush(List<DeviceToken> tokens,
                         String title,
                         String body,
                         String referenceType,
                         Long   referenceId) {

        if (tokens == null || tokens.isEmpty()) return;

        List<String> tokenStrings = tokens.stream()
                .map(DeviceToken::getDeviceToken)
                .collect(Collectors.toList());

        // Batch into chunks of FCM_BATCH_SIZE
        for (int i = 0; i < tokenStrings.size(); i += FCM_BATCH_SIZE) {
            List<String> batch = tokenStrings.subList(
                i, Math.min(i + FCM_BATCH_SIZE, tokenStrings.size())
            );
            sendBatch(batch, title, body, referenceType, referenceId);
        }
    }

    private void sendBatch(List<String> tokens, String title, String body,
                           String referenceType, Long referenceId) {
        MulticastMessage message = MulticastMessage.builder()
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .putAllData(Map.of(
                    "referenceType", referenceType != null ? referenceType : "",
                    "referenceId",   referenceId  != null ? referenceId.toString() : "",
                    "click_action",  "FLUTTER_NOTIFICATION_CLICK"
                ))
                .addAllTokens(tokens)
                .build();

        try {
            BatchResponse response = firebaseMessaging.sendEachForMulticast(message);
            log.info("[FCM] Batch sent: success={} failure={}",
                    response.getSuccessCount(), response.getFailureCount());

            // Handle invalid/unregistered tokens
            if (response.getFailureCount() > 0) {
                List<SendResponse> responses = response.getResponses();
                for (int i = 0; i < responses.size(); i++) {
                    SendResponse sr = responses.get(i);
                    if (!sr.isSuccessful()) {
                        String errorCode = sr.getException() != null
                                ? sr.getException().getMessagingErrorCode() != null
                                    ? sr.getException().getMessagingErrorCode().name()
                                    : "UNKNOWN"
                                : "UNKNOWN";

                        if ("UNREGISTERED".equals(errorCode) || "INVALID_ARGUMENT".equals(errorCode)) {
                            // Token is stale — soft-delete it
                            String staleToken = tokens.get(i);
                            deviceTokenRepository.findByDeviceToken(staleToken)
                                    .ifPresent(dt -> {
                                        dt.setIsDeleted(true);
                                        deviceTokenRepository.save(dt);
                                        log.info("[FCM] Removed stale token for userId={}", dt.getUser().getId());
                                    });
                        } else {
                            log.warn("[FCM] Delivery failed: token={} error={}",
                                    tokens.get(i).substring(0, 10) + "...", errorCode);
                        }
                    }
                }
            }
        } catch (FirebaseMessagingException e) {
            log.error("[FCM] Batch send failed: {}", e.getMessage(), e);
        }
    }
}
