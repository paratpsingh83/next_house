package com.NextHouse.serviceImpl;

import com.NextHouse.constant.OtpPurpose;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.AuthResponseDTO;
import com.NextHouse.dto.response.TokenResponseDTO;
import com.NextHouse.entity.*;
import com.NextHouse.event.DomainEvents;
import com.NextHouse.event.KafkaEventPublisher;
import com.NextHouse.exception.*;
import com.NextHouse.mapper.UserMapper;
import com.NextHouse.repository.*;
import com.NextHouse.security.jwt.JwtTokenProvider;
import com.NextHouse.service.AuthService;
import com.NextHouse.serviceImpl.infra.EmailService;
import com.NextHouse.serviceImpl.infra.OAuth2VerifierService;
import com.NextHouse.serviceImpl.infra.SmsService;
import com.NextHouse.util.geo.GeoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.NextHouse.dto.record.OAuth2UserInfo;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final int OTP_LENGTH       = 6;
    private static final int OTP_TTL_MINUTES  = 10;
    private static final int OTP_MAX_ATTEMPTS = 5;

    @Value("${app.jwt.access-token-expiry-seconds:900}")
    private long accessTokenExpirySeconds;

    @Value("${app.jwt.refresh-token-expiry-days:30}")
    private long refreshTokenExpiryDays;

    private final UserRepository             userRepository;
    private final RefreshTokenRepository     refreshTokenRepository;
    private final OtpVerificationRepository  otpRepository;
    private final DeviceTokenRepository      deviceTokenRepository;
    private final NeighborhoodRepository     neighborhoodRepository;
    private final UserNeighborhoodRepository userNeighborhoodRepository;
    private final UserPresenceRepository     userPresenceRepository;

    private final UserMapper              userMapper;
    private final GeoUtils               geoUtils;
    private final PasswordEncoder        passwordEncoder;
    private final JwtTokenProvider       jwtTokenProvider;
    private final AuthenticationManager  authenticationManager;
    private final KafkaEventPublisher    eventPublisher;

    private final SmsService smsService;
    private final EmailService emailService;
    private final OAuth2VerifierService oauth2VerifierService;
    private final RedisTokenStore       redisTokenStore;

    // ─── Register ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResponseDTO register(RegisterRequestDTO dto) {
        if (userRepository.existsByUsername(dto.getUsername()))
            throw new ConflictException("Username '" + dto.getUsername() + "' is already taken");
        if (dto.getEmail() != null && userRepository.existsByEmail(dto.getEmail()))
            throw new ConflictException("Email is already registered");
        if (userRepository.existsByPhoneNumber(dto.getPhoneNumber()))
            throw new ConflictException("Phone number is already registered");

        User user = userMapper.toEntity(dto);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));

        if (dto.getLatitude() != null && dto.getLongitude() != null) {
            user.setLatitude(dto.getLatitude());
            user.setLongitude(dto.getLongitude());
            user.setLocation(geoUtils.buildPoint(dto.getLatitude(), dto.getLongitude()));
            user.setLastLocationUpdatedAt(LocalDateTime.now());
        }

        User saved = userRepository.save(user);

        if (dto.getLatitude() != null && dto.getLongitude() != null)
            assignNeighborhood(saved, dto.getLatitude(), dto.getLongitude());

        if (dto.getDeviceToken() != null)
            registerDeviceToken(saved, dto.getDeviceToken(), dto.getDeviceType());

        createPresenceRecord(saved);

        eventPublisher.publishUserRegistered(
            DomainEvents.UserRegisteredEvent.builder()
                .eventId(KafkaEventPublisher.newEventId())
                .occurredAt(LocalDateTime.now())
                .actorId(saved.getId()).userId(saved.getId())
                .username(saved.getUsername())
                .latitude(dto.getLatitude()).longitude(dto.getLongitude())
                .build());

        log.info("[Auth] Registered userId={} username={}", saved.getId(), saved.getUsername());
        return buildAuthResponse(saved, dto.getDeviceId(), dto.getDeviceType());
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResponseDTO login(LoginRequestDTO dto) {
        User user = resolveIdentifier(dto.getIdentifier());

        if (user.getBanned())     throw new ForbiddenException("Account banned. Contact support.");
        if (user.getIsDeleted())  throw new UnauthorizedException("Account not found");

        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), dto.getPassword()));
        } catch (BadCredentialsException e) {
            throw new UnauthorizedException("Invalid credentials");
        }

        if (user.getTwoFactorEnabled()) {
            String twoFactorToken = UUID.randomUUID().toString();
            redisTokenStore.store("2fa:" + twoFactorToken, user.getId().toString(), 300);
            return AuthResponseDTO.builder()
                    .twoFactorRequired(true).twoFactorToken(twoFactorToken).build();
        }

        if (dto.getDeviceToken() != null)
            registerDeviceToken(user, dto.getDeviceToken(), dto.getDeviceType());

        log.info("[Auth] Login userId={}", user.getId());
        return buildAuthResponse(user, dto.getDeviceId(), dto.getDeviceType());
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void logout(Long currentUserId, String deviceId) {
        if (deviceId != null) refreshTokenRepository.revokeByDevice(currentUserId, deviceId);
    }

    @Override
    @Transactional
    public void logoutAllDevices(Long currentUserId) {
        refreshTokenRepository.revokeAllForUser(currentUserId);
    }

    // ─── Token refresh ────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TokenResponseDTO refreshToken(RefreshTokenRequestDTO dto) {
        RefreshToken stored = refreshTokenRepository.findByToken(dto.getRefreshToken())
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (stored.getRevoked()) {
            refreshTokenRepository.revokeAllForUser(stored.getUser().getId());
            throw new UnauthorizedException("Refresh token has been revoked");
        }
        if (stored.getExpiryDate().isBefore(LocalDateTime.now()))
            throw new UnauthorizedException("Refresh token expired. Please log in again.");

        User user = stored.getUser();
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        String newAccess  = jwtTokenProvider.generateAccessToken(user);
        String newRefresh = jwtTokenProvider.generateRefreshToken();

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user).token(newRefresh).deviceId(dto.getDeviceId())
                .revoked(false).parentTokenId(stored.getId())
                .expiryDate(LocalDateTime.now().plusDays(refreshTokenExpiryDays)).build());

        return TokenResponseDTO.builder()
                .accessToken(newAccess).refreshToken(newRefresh)
                .tokenType("Bearer").expiresIn(accessTokenExpirySeconds).build();
    }

    // ─── OTP ──────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void requestOtp(OtpRequestDTO dto) {
        String raw  = generateOtp();
        String hash = passwordEncoder.encode(raw);

        otpRepository.save(OtpVerification.builder()
                .phone(dto.getPhone()).email(dto.getEmail())
                .otp(hash).purpose(OtpPurpose.valueOf(dto.getPurpose()))
                .verified(false).attempts(0)
                .expiresAt(LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES)).build());

        if (dto.getPhone() != null)       smsService.sendOtp(dto.getPhone(), raw);
        else if (dto.getEmail() != null)  emailService.sendOtp(dto.getEmail(), raw);
        else throw new BadRequestException("Provide either phone or email for OTP");
    }

    @Override
    @Transactional
    public void verifyOtp(OtpVerifyRequestDTO dto) {
        OtpPurpose purpose = OtpPurpose.valueOf(dto.getPurpose());
        LocalDateTime now  = LocalDateTime.now();

        OtpVerification record = dto.getPhone() != null
                ? otpRepository.findLatestByPhone(dto.getPhone(), purpose, now)
                        .orElseThrow(() -> new BadRequestException("No valid OTP found"))
                : otpRepository.findLatestByEmail(dto.getEmail(), purpose, now)
                        .orElseThrow(() -> new BadRequestException("No valid OTP found"));

        if (record.getAttempts() >= OTP_MAX_ATTEMPTS)
            throw new RateLimitException("Too many OTP attempts. Please request a new OTP.");

        otpRepository.incrementAttempts(record.getId());

        if (!passwordEncoder.matches(dto.getOtp(), record.getOtp()))
            throw new BadRequestException("Invalid OTP");

        record.setVerified(true);
        record.setUsedAt(now);
        otpRepository.save(record);
    }

    // ─── Password ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequestDTO dto) {
        if (dto.getPhone() != null) {
            userRepository.findByPhoneNumber(dto.getPhone())
                    .orElseThrow(() -> new NotFoundException("No account with this phone"));
            requestOtp(OtpRequestDTO.builder().phone(dto.getPhone()).purpose("PASSWORD_RESET").build());
        } else if (dto.getEmail() != null) {
            userRepository.findByEmail(dto.getEmail())
                    .orElseThrow(() -> new NotFoundException("No account with this email"));
            requestOtp(OtpRequestDTO.builder().email(dto.getEmail()).purpose("PASSWORD_RESET").build());
        } else {
            throw new BadRequestException("Provide either phone or email");
        }
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequestDTO dto) {
        if (!dto.getNewPassword().equals(dto.getConfirmPassword()))
            throw new BadRequestException("Passwords do not match");

        String tokenUserId = redisTokenStore.get("reset:" + dto.getResetToken());
        if (tokenUserId == null)
            throw new UnauthorizedException("Invalid or expired reset token");

        User user = findUserOrThrow(Long.parseLong(tokenUserId));
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllForUser(user.getId());
        redisTokenStore.delete("reset:" + dto.getResetToken());
    }

    @Override
    @Transactional
    public void changePassword(Long currentUserId, ChangePasswordRequestDTO dto) {
        User user = findUserOrThrow(currentUserId);
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword()))
            throw new UnauthorizedException("Current password is incorrect");
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllForUser(currentUserId);
    }

    // ─── OAuth2 ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResponseDTO oauth2Login(OAuth2LoginRequestDTO dto) {
        OAuth2UserInfo info = oauth2VerifierService.verify(dto.getProvider(), dto.getIdToken());

        User user = userRepository.findByEmail(info.email()).orElse(null);

        if (user == null) {
            user = User.builder()
                    .name(info.name())
                    .username(generateUniqueUsername(info.name()))
                    .email(info.email())
                    .profileImage(info.pictureUrl())
                    .role("USER").accountStatus("ACTIVE")
                    .verificationStatus("EMAIL_VERIFIED")
                    .trustScore(10).addressVerified(false)
                    .identityVerified(false).banned(false).twoFactorEnabled(false)
                    .build();
            user = userRepository.save(user);
            createPresenceRecord(user);
            log.info("[Auth] OAuth2 registered userId={} via {}", user.getId(), dto.getProvider());
        }

        if (user.getBanned()) throw new ForbiddenException("Account banned");

        if (dto.getDeviceToken() != null)
            registerDeviceToken(user, dto.getDeviceToken(), dto.getDeviceType());

        return buildAuthResponse(user, dto.getDeviceId(), dto.getDeviceType());
    }

    // ─── 2FA ──────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void enableTwoFactor(Long currentUserId) {
        User user = findUserOrThrow(currentUserId);
        if (user.getTwoFactorEnabled())
            throw new ConflictException("2FA is already enabled");
        if (user.getPhoneNumber() == null || user.getPhoneNumber().isBlank())
            throw new BadRequestException("A verified phone number is required to enable 2FA");
        user.setTwoFactorEnabled(true);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void disableTwoFactor(Long currentUserId) {
        User user = findUserOrThrow(currentUserId);
        user.setTwoFactorEnabled(false);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public AuthResponseDTO verifyTwoFactor(Long currentUserId, String otp) {
        User user = findUserOrThrow(currentUserId);
        verifyOtp(OtpVerifyRequestDTO.builder()
                .phone(user.getPhoneNumber()).otp(otp)
                .purpose(OtpPurpose.TWO_FACTOR_AUTH.name()).build());
        return buildAuthResponse(user, null, null);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private AuthResponseDTO buildAuthResponse(User user, String deviceId, String deviceType) {
        String accessToken  = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken();

        if (deviceId != null) refreshTokenRepository.revokeByDevice(user.getId(), deviceId);

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user).token(refreshToken).deviceId(deviceId).revoked(false)
                .expiryDate(LocalDateTime.now().plusDays(refreshTokenExpiryDays)).build());

        return AuthResponseDTO.builder()
                .accessToken(accessToken).refreshToken(refreshToken)
                .tokenType("Bearer").expiresIn(accessTokenExpirySeconds)
                .user(userMapper.toResponse(user)).twoFactorRequired(false).build();
    }

    private User resolveIdentifier(String identifier) {
        if (identifier.contains("@"))
            return userRepository.findByEmail(identifier)
                    .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        return userRepository.findByPhoneNumber(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private String generateOtp() {
        return String.valueOf(100_000 + new SecureRandom().nextInt(900_000));
    }

    private String generateUniqueUsername(String name) {
        String base = name.toLowerCase().replaceAll("[^a-z0-9]", "");
        if (base.length() < 3) base = "user" + base;
        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) candidate = base + suffix++;
        return candidate;
    }

    private void assignNeighborhood(User user, double lat, double lon) {
        neighborhoodRepository.findNeighborhoodContainingPoint(lat, lon)
            .or(() -> neighborhoodRepository.findNearestNeighborhoods(lat, lon, 1).stream().findFirst())
            .ifPresent(nbh -> userNeighborhoodRepository.save(UserNeighborhood.builder()
                    .user(user).neighborhood(nbh).primaryNeighborhood(true).verified(false).build()));
    }

    private void registerDeviceToken(User user, String token, String deviceType) {
        deviceTokenRepository.findByDeviceToken(token).ifPresentOrElse(
            existing -> { existing.setUser(user); existing.setLastUsedAt(LocalDateTime.now());
                          deviceTokenRepository.save(existing); },
            () -> deviceTokenRepository.save(DeviceToken.builder()
                    .user(user).deviceToken(token).deviceType(deviceType)
                    .lastUsedAt(LocalDateTime.now()).build()));
    }

    private void createPresenceRecord(User user) {
        if (userPresenceRepository.findByUserId(user.getId()).isEmpty()) {
            userPresenceRepository.save(UserPresence.builder()
                    .user(user).online(false).lastSeen(LocalDateTime.now()).build());
        }
    }

}
