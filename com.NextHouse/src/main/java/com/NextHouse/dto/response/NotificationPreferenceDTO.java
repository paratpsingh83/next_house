package com.NextHouse.dto.response;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class NotificationPreferenceDTO {
    private boolean likes;
    private boolean comments;
    private boolean follows;
    private boolean followRequests;
    private boolean messages;
    private boolean activities;
    private boolean marketplace;
    private boolean safetyAlerts;
    private boolean communities;
}
