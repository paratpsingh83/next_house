package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import org.locationtech.jts.geom.Polygon;

@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@Entity
@Table(
        name = "neighborhoods",
        indexes = {
                @Index(name = "idx_neighborhood_postal", columnList = "postal_code"),
                @Index(name = "idx_neighborhood_city", columnList = "city")
                // GIST index on `boundary` and `location` must be created via Flyway migration:
                // CREATE INDEX idx_neighborhood_boundary ON neighborhoods USING GIST(boundary);
                // CREATE INDEX idx_neighborhood_location ON neighborhoods USING GIST(location);
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Neighborhood extends GeoBaseEntity {

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "postal_code", length = 20)
    private String postalCode;

    @Column(name = "district", length = 100)
    private String district;

    @Column(name = "region", length = 100)
    private String region;

    /**
     * Radius in meters — used as fallback when polygon boundary is not set.
     */
    @Column(name = "radius_meters")
    private Integer radiusMeters;

    @Column(name = "boundary", columnDefinition = "geography(Polygon,4326)")
    private Polygon boundary;

    @Column(name = "population")
    private Integer population;

    @Builder.Default
    @Column(name = "verified", nullable = false)
    private Boolean verified = false;
}
