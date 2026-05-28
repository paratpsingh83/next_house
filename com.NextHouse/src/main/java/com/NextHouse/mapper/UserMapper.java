package com.NextHouse.mapper;

import com.NextHouse.dto.request.RegisterRequestDTO;
import com.NextHouse.dto.request.UpdateProfileRequestDTO;
import com.NextHouse.dto.response.UserResponseDTO;
import com.NextHouse.dto.response.UserSummaryDTO;
import com.NextHouse.entity.User;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface UserMapper {

    /**
     * RegisterRequestDTO → User entity.
     *
     * After User extends GeoBaseEntity, MapStruct will AUTO-MAP:
     *   RegisterRequestDTO.latitude  → User.latitude  (inherited from GeoBaseEntity) ✓
     *   RegisterRequestDTO.longitude → User.longitude (inherited from GeoBaseEntity) ✓
     *
     * But: deviceId, deviceType, deviceToken have no matching fields in User
     * → safely ignored by unmappedTargetPolicy = IGNORE.
     *
     * location (Point) is ignored here — service builds PostGIS Point manually
     * via geoUtils.buildPoint() because MapStruct cannot construct a JTS Point.
     */
    @Mapping(target = "id",                    ignore = true)
    @Mapping(target = "password",              ignore = true)
    @Mapping(target = "role",                  constant = "USER")
    @Mapping(target = "accountStatus",         constant = "ACTIVE")
    @Mapping(target = "verificationStatus",    constant = "UNVERIFIED")
    @Mapping(target = "trustScore",            constant = "0")
    @Mapping(target = "addressVerified",       constant = "false")
    @Mapping(target = "identityVerified",      constant = "false")
    @Mapping(target = "banned",                constant = "false")
    @Mapping(target = "twoFactorEnabled",      constant = "false")
    @Mapping(target = "location",              ignore = true) // service builds PostGIS Point
    @Mapping(target = "createdAt",             ignore = true)
    @Mapping(target = "updatedAt",             ignore = true)
    @Mapping(target = "isDeleted",             ignore = true)
    @Mapping(target = "active",                ignore = true)
    @Mapping(target = "lastLocationUpdatedAt", ignore = true)
    User toEntity(RegisterRequestDTO dto);

    /**
     * User → full profile response.
     * Presence + relationship fields (online, lastSeen, followerCount, isFollowing, etc.)
     * are enriched by UserServiceImpl.buildUserResponse() AFTER this mapper call.
     * They are intentionally left null here.
     */
    @Mapping(target = "online",        ignore = true)
    @Mapping(target = "lastSeen",      ignore = true)
    @Mapping(target = "followerCount", ignore = true)
    @Mapping(target = "followingCount",ignore = true)
    @Mapping(target = "isFollowing",   ignore = true)
    @Mapping(target = "isFollowedBy",  ignore = true)
    @Mapping(target = "isBlocked",     ignore = true)
    UserResponseDTO toResponse(User user);

    /** User → lightweight embed for other DTOs (post author, chat sender, etc.) */
    @Mapping(target = "online", ignore = true)
    UserSummaryDTO toSummary(User user);

    /**
     * Partial profile update.
     *
     * FIX: Geo fields from UpdateProfileRequestDTO (latitude, longitude, address,
     *      city, state, country, zipCode) are EXPLICITLY IGNORED here.
     *
     * WHY: These fields exist on UpdateProfileRequestDTO AND on User (via GeoBaseEntity).
     *      MapStruct would auto-map them, which would be WRONG because:
     *        1. location (PostGIS Point) must be rebuilt by geoUtils.buildPoint()
     *           whenever lat/lon change — MapStruct cannot do this.
     *        2. UserServiceImpl.updateProfile() handles geo separately:
     *             if (dto.getLatitude() != null && dto.getLongitude() != null) {
     *               user.setLocation(geoUtils.buildPoint(...));  ← rebuilds PostGIS point
     *               user.setLastLocationUpdatedAt(now);
     *             }
     *        3. updateLocation() is the dedicated endpoint for location updates.
     *           updateProfile() should only update profile fields (name, bio, etc.)
     *           NOT silently overwrite lat/lon without updating the PostGIS Point.
     *
     * Sensitive fields (password, role, banned) always ignored regardless of DTO.
     */
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id",                    ignore = true)
    @Mapping(target = "password",              ignore = true)
    @Mapping(target = "role",                  ignore = true)
    @Mapping(target = "banned",                ignore = true)
    @Mapping(target = "trustScore",            ignore = true)
    @Mapping(target = "accountStatus",         ignore = true)
    @Mapping(target = "verificationStatus",    ignore = true)
    @Mapping(target = "addressVerified",       ignore = true)
    @Mapping(target = "identityVerified",      ignore = true)
    @Mapping(target = "twoFactorEnabled",      ignore = true)
    @Mapping(target = "phoneNumber",           ignore = true)
    @Mapping(target = "email",                 ignore = true)
    @Mapping(target = "username",              ignore = true)
    // FIX: Geo fields explicitly ignored — service handles them with PostGIS rebuild
    @Mapping(target = "latitude",              ignore = true)
    @Mapping(target = "longitude",             ignore = true)
    @Mapping(target = "address",               ignore = true)
    @Mapping(target = "city",                  ignore = true)
    @Mapping(target = "state",                 ignore = true)
    @Mapping(target = "country",               ignore = true)
    @Mapping(target = "zipCode",               ignore = true)
    @Mapping(target = "location",              ignore = true)
    @Mapping(target = "lastLocationUpdatedAt", ignore = true)
    void updateFromRequest(UpdateProfileRequestDTO dto, @MappingTarget User user);
}
