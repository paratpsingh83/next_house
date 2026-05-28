package com.NextHouse.dto.request;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinActivityRequestDTO {
    /**
     * Optional note from the user when requesting to join (shown to host).
     */
    private String note;
}
