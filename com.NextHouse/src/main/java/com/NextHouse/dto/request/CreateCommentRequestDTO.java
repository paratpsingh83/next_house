package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequestDTO {

    @NotBlank(message = "Comment content is required")
    @Size(max = 1000)
    private String comment;

    private Long parentCommentId;
}
