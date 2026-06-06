package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
    name = "story_views",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_story_view", columnNames = {"story_id", "viewer_id"})
    },
    indexes = {
        @Index(name = "idx_story_view_story",  columnList = "story_id"),
        @Index(name = "idx_story_view_viewer", columnList = "viewer_id"),
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StoryView extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_story_view_story"))
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewer_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_story_view_viewer"))
    private User viewer;
}