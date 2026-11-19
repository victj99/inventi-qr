package com.nexo.inventario.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Limita los intentos FALLIDOS de contraseña por correo + IP.
 *
 * <p>Ventana deslizante fija de 5 minutos: tras 8 fallos, el siguiente intento se rechaza con 429
 * sin llegar a comprobar la contraseña. Un inicio de sesión correcto limpia el contador. En memoria
 * y sin dependencias: suficiente para una única instancia (el despliegue actual).
 */
@Component
public class LoginRateLimiter {

    public static final String MENSAJE_LIMITE =
            "Demasiados intentos fallidos. Espera unos minutos y vuelve a intentarlo.";

    static final int MAX_FALLOS = 8;
    static final Duration VENTANA = Duration.ofMinutes(5);
    private static final int LIMPIEZA_UMBRAL = 5_000;

    private final Clock clock;
    private final Map<String, Estado> estados = new ConcurrentHashMap<>();

    public LoginRateLimiter() {
        this(Clock.systemUTC());
    }

    LoginRateLimiter(Clock clock) {
        this.clock = clock;
    }

    private record Estado(Instant inicio, int fallos) {
        boolean expirado(Instant ahora) {
            return !inicio.plus(VENTANA).isAfter(ahora);
        }
    }

    /** Clave estable: correo normalizado + IP de origen (X-Forwarded-For ya resuelto por Tomcat). */
    public static String clave(String correo, String ip) {
        String email =
                correo == null ? "" : correo.trim().toLowerCase(Locale.ROOT);
        String origen = ip == null ? "" : ip.trim();
        return email + "|" + origen;
    }

    public boolean permitir(String clave) {
        Estado e = estados.get(clave);
        if (e == null)
            return true;
        if (e.expirado(clock.instant())) {
            estados.remove(clave, e);
            return true;
        }
        return e.fallos() < MAX_FALLOS;
    }

    public void fallo(String clave) {
        depurar();
        Instant ahora = clock.instant();
        estados.compute(
                clave,
                (k, e) ->
                        e == null || e.expirado(ahora)
                                ? new Estado(ahora, 1)
                                : new Estado(e.inicio(), e.fallos() + 1));
    }

    public void exito(String clave) {
        estados.remove(clave);
    }

    private void depurar() {
        if (estados.size() < LIMPIEZA_UMBRAL)
            return;
        Instant ahora = clock.instant();
        estados.entrySet().removeIf(x -> x.getValue().expirado(ahora));
    }
}
