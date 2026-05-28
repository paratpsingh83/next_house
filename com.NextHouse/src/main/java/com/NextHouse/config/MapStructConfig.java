package com.NextHouse.config;

import org.mapstruct.MapperConfig;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

/**
 * Global MapStruct configuration.
 * <p>
 * Individual mappers may override these defaults per-method using
 *
 * @BeanMapping annotations, but the defaults here are safe for production:
 * <p>
 * - unmappedTargetPolicy = IGNORE: new fields added to DTOs won't break builds.
 * - nullValuePropertyMappingStrategy = IGNORE: null DTO fields won't wipe entity fields
 * during partial updates (@MappingTarget methods).
 * <p>
 * Maven dependency (add to pom.xml):
 * ─────────────────────────────────────────────────────────────────────────────
 * <dependency>
 * <groupId>org.mapstruct</groupId>
 * <artifactId>mapstruct</artifactId>
 * <version>1.5.5.Final</version>
 * </dependency>
 *
 * <build>
 * <plugins>
 * <plugin>
 * <groupId>org.apache.maven.plugins</groupId>
 * <artifactId>maven-compiler-plugin</artifactId>
 * <configuration>
 * <annotationProcessorPaths>
 * <path>
 * <groupId>org.mapstruct</groupId>
 * <artifactId>mapstruct-processor</artifactId>
 * <version>1.5.5.Final</version>
 * </path>
 * <path>
 * <groupId>org.projectlombok</groupId>
 * <artifactId>lombok</artifactId>
 * <version>${lombok.version}</version>
 * </path>
 * <!-- lombok-mapstruct-binding must come LAST -->
 * <path>
 * <groupId>org.projectlombok</groupId>
 * <artifactId>lombok-mapstruct-binding</artifactId>
 * <version>0.2.0</version>
 * </path>
 * </annotationProcessorPaths>
 * </configuration>
 * </plugin>
 * </plugins>
 * </build>
 * ─────────────────────────────────────────────────────────────────────────────
 * <p>
 * IMPORTANT: lombok-mapstruct-binding must come after mapstruct-processor
 * and lombok in the annotationProcessorPaths list. This ensures Lombok
 * generates getters/setters BEFORE MapStruct reads them. Without this,
 * MapStruct silently falls back to field access and generates broken code.
 */
@MapperConfig(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface MapStructConfig {
    // Marker interface — no methods needed.
    // Reference in mappers: @Mapper(config = MapStructConfig.class)
}
