package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "media_files",
        indexes = {
                @Index(name = "idx_media_entity", columnList = "entity_type, entity_id"),
                @Index(name = "idx_media_uploader", columnList = "uploaded_by")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MediaFile extends BaseEntity {

    /**
     * Public CDN URL for delivery.
     */
    @Column(name = "url", nullable = false, length = 1000)
    private String url;

    /**
     * IMAGE | VIDEO | AUDIO | DOCUMENT
     */
    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "storage_provider", length = 30)
    private String storageProvider;

    @Column(name = "storage_key", length = 500)
    private String storageKey;

    @Column(name = "size")
    private Long size;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "thumbnail_url", length = 1000)
    private String thumbnailUrl;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    /**
     * Polymorphic reference: POST | CHAT | ACTIVITY | MARKETPLACE | COMMUNITY | USER
     */
    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false,
            foreignKey = @ForeignKey(name = "fk_media_file_uploader"))
    private User uploadedBy;
}
