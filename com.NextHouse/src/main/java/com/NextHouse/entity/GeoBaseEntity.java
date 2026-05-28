package com.NextHouse.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.locationtech.jts.geom.Point;

@Getter
@Setter
@MappedSuperclass
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public abstract class GeoBaseEntity extends BaseEntity {

    @Column(name = "latitude")
    protected Double latitude;

    @Column(name = "longitude")
    protected Double longitude;

    @Column(name = "address", length = 500)
    protected String address;

    @Column(name = "city", length = 100)
    protected String city;

    @Column(name = "state", length = 100)
    protected String state;

    @Column(name = "country", length = 100)
    protected String country;

    @Column(name = "zip_code", length = 20)
    protected String zipCode;

    @Column(name = "location", columnDefinition = "geography(Point,4326)")
    protected Point location;
}
