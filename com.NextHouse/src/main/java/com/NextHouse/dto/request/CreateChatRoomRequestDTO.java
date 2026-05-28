package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateChatRoomRequestDTO {

    @NotBlank(message = "Room type is required")
    private String roomType; // DIRECT | GROUP

    @Size(max = 200)
    private String title;

    private String avatarUrl;

    /**
     * For DIRECT rooms: one userId. For GROUP: multiple.
     */
    @NotEmpty(message = "At least one member required")
    private List<Long> memberIds;
}
