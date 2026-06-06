package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequestDTO {

    @Size(min = 2, max = 100)
    private String name;

    @Size(max = 500)
    private String bio;

    private String gender;
    private LocalDate dob;
    private String profileImage;

    private Boolean isPrivate;

    // Location update
    private Double latitude;
    private Double longitude;
    private String address;
    private String city;
    private String state;
    private String country;
    private String zipCode;
}
