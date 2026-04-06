package com.djngoma.devilsaidictionary

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Basic unit coverage for the push opt-in status enum and its wire format.
 * Full end-to-end coverage of PhonePushManager requires an instrumented
 * test that can boot a Context; that lives alongside the emulator suite.
 */
class PushOptInStatusTest {
    @Test
    fun wireValuesMatchServerSchema() {
        assertEquals("authorized", PushOptInStatus.authorized.wireValue)
        assertEquals("denied", PushOptInStatus.denied.wireValue)
        assertEquals("notDetermined", PushOptInStatus.notDetermined.wireValue)
        assertEquals("unsupported", PushOptInStatus.unsupported.wireValue)
        assertEquals("unknown", PushOptInStatus.unknown.wireValue)
    }

    @Test
    fun allStatusesRoundTripThroughWireValue() {
        for (status in PushOptInStatus.values()) {
            val parsed = PushOptInStatus.values().firstOrNull { it.wireValue == status.wireValue }
            assertEquals(status, parsed)
        }
    }
}
