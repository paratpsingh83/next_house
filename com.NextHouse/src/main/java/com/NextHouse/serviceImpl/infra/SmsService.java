package com.NextHouse.serviceImpl.infra;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * SmsService
 *
 * Wraps Twilio (or AWS SNS) for OTP and transactional SMS delivery.
 * Replace stub bodies with real SDK calls when ready.
 *
 * Real implementation needs in application.yml:
 *   twilio:
 *     account-sid: ${TWILIO_ACCOUNT_SID}
 *     auth-token:  ${TWILIO_AUTH_TOKEN}
 *     from-number: +1234567890
 *
 * Maven dependency to add when implementing:
 *   <dependency>
 *     <groupId>com.twilio.sdk</groupId>
 *     <artifactId>twilio</artifactId>
 *     <version>10.1.0</version>
 *   </dependency>
 *
 * Called by: AuthServiceImpl.requestOtp()
 */
@Slf4j
@Service
public class SmsService {

    public void sendOtp(String phoneNumber, String otp) {
        // TODO: Replace with real Twilio/SNS call
        // Message.creator(
        //     new PhoneNumber(phoneNumber),
        //     new PhoneNumber(fromNumber),
        //     "Your NexHouse code: " + otp + ". Valid for 10 minutes.")
        //     .create();
        log.info("[SMS] OTP stub → {} : {}", phoneNumber, otp);
    }

    public void sendMessage(String phoneNumber, String message) {
        // TODO: Replace with real SMS call
        log.debug("[SMS] Message stub → {} : {}", phoneNumber, message);
    }
}
