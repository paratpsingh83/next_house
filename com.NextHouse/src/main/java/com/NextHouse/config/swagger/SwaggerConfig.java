package com.NextHouse.config.swagger;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * SwaggerConfig — OpenAPI 3.1 / Springdoc configuration.
 *
 * Swagger UI: http://localhost:8080/swagger-ui/index.html
 * OpenAPI JSON: http://localhost:8080/v3/api-docs
 *
 * application.yml:
 * ─────────────────────────────────────────────────────────────────────────
 * springdoc:
 *   api-docs:
 *     path: /v3/api-docs
 *   swagger-ui:
 *     path: /swagger-ui.html
 *     tags-sorter: alpha
 *     operations-sorter: method
 *     display-request-duration: true
 *     try-it-out-enabled: true
 *   show-actuator: false
 *   default-produces-media-type: application/json
 * ─────────────────────────────────────────────────────────────────────────
 */
@Configuration
public class SwaggerConfig {

    @Value("${server.port:8080}")
    private String serverPort;

    @Bean
    public OpenAPI nexthouseOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("NexHouse API")
                .description("""
                    **NexHouse** — Hyperlocal community platform API.
                    
                    ## Authentication
                    All secured endpoints require a **Bearer JWT** token in the `Authorization` header:
                    ```
                    Authorization: Bearer <access_token>
                    ```
                    Obtain a token via `POST /api/v1/auth/login` or `POST /api/v1/auth/register`.
                    
                    ## Rate Limiting
                    - General endpoints: **120 requests/min** per IP or user
                    - Auth endpoints: **10 requests/min** per IP
                    - Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
                    
                    ## Pagination
                    All list endpoints support: `?page=0&size=20`
                    Response includes: `page`, `size`, `totalElements`, `totalPages`, `hasNext`
                    """)
                .version("1.0.0")
                .contact(new Contact()
                    .name("NexHouse Team")
                    .email("api@nexthouse.app")
                    .url("https://nexthouse.app"))
                .license(new License()
                    .name("Proprietary")
                    .url("https://nexthouse.app/terms")))

            .servers(List.of(
                new Server().url("http://localhost:" + serverPort).description("Local Development"),
                new Server().url("https://api.nexthouse.app").description("Production")
            ))

            // Global JWT security scheme — appears as "Authorize" button in Swagger UI
            .components(new Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .name("bearerAuth")
                    .description("Enter your JWT access token (without 'Bearer ' prefix)")))

            // Apply bearer auth globally — individual public endpoints use @SecurityRequirements({})
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))

            // API tag grouping (matches @Tag on each controller)
            .tags(List.of(
                new Tag().name("Auth").description("Registration, login, token refresh, OTP, OAuth2, 2FA"),
                new Tag().name("Users").description("User profiles, follow system, block system, nearby users"),
                new Tag().name("Posts").description("Post CRUD, reactions, comments, feed endpoints"),
                new Tag().name("Activities").description("Local event creation, join/leave, member management"),
                new Tag().name("Communities").description("Community management, membership, discovery"),
                new Tag().name("Chat").description("Direct and group messaging, inbox, real-time chat"),
                new Tag().name("Notifications").description("In-app notification management"),
                new Tag().name("Marketplace").description("Buy/sell/free listings in the neighbourhood"),
                new Tag().name("Borrow Requests").description("Neighbourhood borrow/lend requests"),
                new Tag().name("Safety Alerts").description("Local safety and emergency alerts"),
                new Tag().name("Search").description("Global search, autocomplete, trending keywords"),
                new Tag().name("Neighborhoods").description("Neighborhood detection and assignment"),
                new Tag().name("Media").description("File upload and media management"),
                new Tag().name("Admin").description("Admin-only: user management, moderation, reports"),
                new Tag().name("Moderation").description("Content moderation queue (Admin + Moderator)")
            ))

            .externalDocs(new ExternalDocumentation()
                .description("NexHouse Developer Docs")
                .url("https://docs.nexthouse.app"));
    }
}
