package com.nexo.inventario.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class LoginRateLimiterTest {

    /** Reloj manual para no esperar 5 minutos en la prueba. */
    private static final class Reloj extends Clock {
        private Instant ahora = Instant.parse("2026-01-01T00:00:00Z");

        void avanzar(Duration d) {
            ahora = ahora.plus(d);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return ahora;
        }
    }

    @Test
    void bloqueaAlNovenoIntentoFallido() {
        Reloj reloj = new Reloj();
        LoginRateLimiter limiter = new LoginRateLimiter(reloj);
        String clave = LoginRateLimiter.clave("Admin@Inventi.pe ", "10.0.0.1");

        for (int i = 0; i < 8; i++) {
            assertTrue(limiter.permitir(clave), "intento " + (i + 1) + " permitido");
            limiter.fallo(clave);
        }
        assertFalse(limiter.permitir(clave), "el noveno intento se rechaza");
    }

    @Test
    void elExitoLimpiaElContador() {
        Reloj reloj = new Reloj();
        LoginRateLimiter limiter = new LoginRateLimiter(reloj);
        String clave = LoginRateLimiter.clave("tecnico@inventi.pe", "10.0.0.2");

        for (int i = 0; i < 8; i++)
            limiter.fallo(clave);
        assertFalse(limiter.permitir(clave));

        limiter.exito(clave);
        assertTrue(limiter.permitir(clave));
    }

    @Test
    void laVentanaCaduca() {
        Reloj reloj = new Reloj();
        LoginRateLimiter limiter = new LoginRateLimiter(reloj);
        String clave = LoginRateLimiter.clave("consulta@inventi.pe", "10.0.0.3");

        for (int i = 0; i < 8; i++)
            limiter.fallo(clave);
        assertFalse(limiter.permitir(clave));

        reloj.avanzar(Duration.ofMinutes(5).plusSeconds(1));
        assertTrue(limiter.permitir(clave));
        limiter.fallo(clave);
        assertTrue(limiter.permitir(clave), "el contador se reinicia con la ventana");
    }

    @Test
    void separaPorCorreoYPorIp() {
        LoginRateLimiter limiter = new LoginRateLimiter();
        String a = LoginRateLimiter.clave("admin@inventi.pe", "10.0.0.4");
        String b = LoginRateLimiter.clave("admin@inventi.pe", "10.0.0.5");

        for (int i = 0; i < 8; i++)
            limiter.fallo(a);
        assertFalse(limiter.permitir(a));
        assertTrue(limiter.permitir(b));
    }
}
