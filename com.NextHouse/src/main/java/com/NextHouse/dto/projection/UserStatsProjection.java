package com.NextHouse.dto.projection;

import java.time.LocalDateTime;

public interface UserStatsProjection {
    Long          getFollowerCount();
    Long          getFollowingCount();
    Boolean       getOnline();
    LocalDateTime getLastSeen();
    Boolean       getIsFollowing();
    Boolean       getIsFollowedBy();
    Boolean       getIsBlocked();
    Boolean       getIsRequested();
}
