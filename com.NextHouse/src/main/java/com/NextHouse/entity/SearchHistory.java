package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "search_history",
        indexes = {
                @Index(name = "idx_search_user_time", columnList = "user_id, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SearchHistory extends BaseEntity {

    @Column(name = "keyword", nullable = false, length = 200)
    private String keyword;

    /**
     * POST | USER | ACTIVITY | COMMUNITY | MARKETPLACE | ALL
     */
    @Column(name = "search_type", length = 30)
    private String searchType = "ALL";

    @Column(name = "result_count")
    private Integer resultCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_search_history_user"))
    private User user;
}
