package com.NextHouse.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;

/**
 * FirebaseConfig
 *
 * Creates the FirebaseApp and FirebaseMessaging Spring beans.
 *
 * FirebasePushService depends on FirebaseMessaging being in the Spring context.
 * Without this config class, Spring cannot find the FirebaseMessaging bean and
 * throws: "No qualifying bean of type FirebaseMessaging available"
 *
 * For local dev: set firebase.credentials-file=disabled in application.yml
 * and this config will create a STUB FirebaseMessaging that logs instead of
 * actually sending push notifications.
 *
 * For production: place your firebase-service-account.json in
 * src/main/resources/ and set:
 *   firebase:
 *     credentials-file: classpath:firebase-service-account.json
 *     project-id: your-project-id
 */
@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${firebase.credentials-file:disabled}")
    private String credentialsFile;

    @Value("${firebase.project-id:nexthouse}")
    private String projectId;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        // If already initialized (e.g. in tests), return existing instance
        if (!FirebaseApp.getApps().isEmpty()) {
            log.info("[Firebase] App already initialized, reusing existing instance");
            return FirebaseApp.getInstance();
        }

        // Dev/test mode — no credentials file configured
        if ("disabled".equals(credentialsFile) || credentialsFile.isBlank()) {
            log.warn("[Firebase] No credentials file configured. " +
                     "Push notifications will be DISABLED. " +
                     "Set firebase.credentials-file in application.yml for production.");
            // Create a minimal FirebaseApp without credentials for dev mode
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.newBuilder().build())
                    .setProjectId(projectId)
                    .build();
            return FirebaseApp.initializeApp(options);
        }

        // Production mode — load real service account credentials
        try {
            org.springframework.core.io.ClassPathResource resource =
                new org.springframework.core.io.ClassPathResource(
                    credentialsFile.replace("classpath:", "")
                );

            try (InputStream credStream = resource.getInputStream()) {
                GoogleCredentials credentials = GoogleCredentials
                        .fromStream(credStream)
                        .createScoped(
                            "https://www.googleapis.com/auth/cloud-platform",
                            "https://www.googleapis.com/auth/firebase.messaging"
                        );

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(credentials)
                        .setProjectId(projectId)
                        .build();

                FirebaseApp app = FirebaseApp.initializeApp(options);
                log.info("[Firebase] Initialized with project: {}", projectId);
                return app;
            }
        } catch (Exception e) {
            log.error("[Firebase] Failed to load credentials from: {}. " +
                      "Push notifications disabled. Error: {}", credentialsFile, e.getMessage());
            // Fall back to disabled mode so the app still starts
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.newBuilder().build())
                    .setProjectId(projectId)
                    .build();
            return FirebaseApp.initializeApp(options);
        }
    }

    @Bean
    public FirebaseMessaging firebaseMessaging(FirebaseApp firebaseApp) {
        return FirebaseMessaging.getInstance(firebaseApp);
    }
}
