package com.NextHouse.serviceImpl.infra;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * EmailService
 *
 * Wraps JavaMailSender / AWS SES for transactional email delivery.
 * Replace stub bodies with real implementation when ready.
 *
 * Real implementation needs in application.yml:
 *   spring:
 *     mail:
 *       host: email-smtp.ap-southeast-1.amazonaws.com
 *       port: 587
 *       username: ${SES_USERNAME}
 *       password: ${SES_PASSWORD}
 *       properties:
 *         mail.smtp.auth: true
 *         mail.smtp.starttls.enable: true
 *
 * Called by: AuthServiceImpl.requestOtp()
 */
@Slf4j
@Service
public class EmailService {

    public void sendOtp(String email, String otp) {
        // TODO: Replace with real JavaMailSender call
        // SimpleMailMessage msg = new SimpleMailMessage();
        // msg.setTo(email);
        // msg.setSubject("Your NexHouse verification code");
        // msg.setText("Your OTP is: " + otp + "\nValid for 10 minutes.");
        // mailSender.send(msg);
        log.info("[Email] OTP stub → {} : {}", email, otp);
    }

    public void sendWelcome(String email, String name) {
        // TODO: Replace with HTML template email
        log.debug("[Email] Welcome stub → {} name={}", email, name);
    }

    public void sendPasswordReset(String email, String resetLink) {
        // TODO: Replace with HTML template email
        log.debug("[Email] Password reset stub → {}", email);
    }
}
