package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@MappedSuperclass
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public abstract class CommunityScopedEntity extends GeoBaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", foreignKey = @ForeignKey(name = "fk_scoped_community"))
    protected Community community;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "neighborhood_id", foreignKey = @ForeignKey(name = "fk_scoped_neighborhood"))
    protected Neighborhood neighborhood;
}
