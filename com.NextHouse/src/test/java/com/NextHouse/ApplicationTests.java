package com.NextHouse;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@Disabled("Requires a running PostgreSQL + PostGIS instance. Run manually with the database up.")
@SpringBootTest
@ActiveProfiles("test")
class ApplicationTests {

	@Test
	void contextLoads() {
	}

}
