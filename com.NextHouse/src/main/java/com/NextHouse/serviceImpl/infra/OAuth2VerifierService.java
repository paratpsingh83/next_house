package com.NextHouse.serviceImpl.infra;

import com.NextHouse.dto.record.OAuth2UserInfo;  // ← import from its NEW package
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class OAuth2VerifierService {

    public OAuth2UserInfo verify(String provider, String idToken) {
        log.warn("[OAuth2] Stub verifier called for provider={}. Replace with real SDK.", provider);
        return new OAuth2UserInfo(
            "stub@example.com",
            "OAuth2 User",
            null
        );
    }
}
