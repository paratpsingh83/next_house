package com.NextHouse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class ApplicationTests {

	@Test
	void contextLoads() {
		// Just verifies the Spring context starts without errors.
		// No assertions needed — if the context fails to load,
		// Spring throws an exception and the test fails automatically.
	}

}
