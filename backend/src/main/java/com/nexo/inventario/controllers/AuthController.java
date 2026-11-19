package com.nexo.inventario.controllers;

import com.nexo.inventario.domain.Usuario;
import com.nexo.inventario.security.JwtService;
import com.nexo.inventario.security.LoginRateLimiter;
import com.nexo.inventario.security.PermisoInterceptor;
import com.nexo.inventario.security.RequirePermiso;
import com.nexo.inventario.services.UsuarioService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.ServletRequestWrapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarios;
    private final JwtService jwt;
    private final LoginRateLimiter limiter;

    public AuthController(UsuarioService usuarios, JwtService jwt, LoginRateLimiter limiter) {
        this.usuarios = usuarios;
        this.jwt = jwt;
        this.limiter = limiter;
    }

    public record LoginReq(
            @NotBlank(message = "obligatorio")
                    @Email(message = "correo no válido")
                    @Size(max = 120, message = "máximo 120 caracteres")
                    String email,
            @NotBlank(message = "obligatorio")
                    @Size(max = 100, message = "máximo 100 caracteres")
                    String password) {
    }

    public record PerfilReq(
            @NotBlank(message = "obligatorio")
                    @Size(max = 80, message = "máximo 80 caracteres")
                    String nombre) {
    }

    public record PasswordReq(
            @NotBlank(message = "obligatorio") String actual,
            @NotBlank(message = "obligatorio")
                    @Size(min = 8, max = 100, message = "entre 8 y 100 caracteres")
                    String nueva) {
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginReq req, HttpServletRequest http) {
        String clave = LoginRateLimiter.clave(req.email(), ipCliente(http));
        if (!limiter.permitir(clave)) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS, LoginRateLimiter.MENSAJE_LIMITE);
        }
        Usuario u;
        try {
            u = usuarios.autenticar(req.email(), req.password());
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
                // Solo cuenta como fallo una contraseña incorrecta (no una cuenta desactivada).
                limiter.fallo(clave);
            }
            throw ex;
        }
        limiter.exito(clave);
        String token = jwt.generar(u.id, u.rol, u.nombre, u.email, u.tokenVersion);
        return Map.of("token", token, "usuario", UsuarioController.vista(u));
    }

    @GetMapping("/me")
    @RequirePermiso("ver")
    public Map<String, Object> me() {
        return UsuarioController.vista(usuarioActual());
    }

    @PatchMapping("/perfil")
    @RequirePermiso("ver")
    public Map<String, Object> perfil(@Valid @RequestBody PerfilReq req) {
        Usuario u = usuarioActual();
        return UsuarioController.vista(usuarios.actualizarPerfil(u.id, req.nombre()));
    }

    @PostMapping("/password")
    @RequirePermiso("ver")
    public Map<String, Object> password(@Valid @RequestBody PasswordReq req) {
        Usuario u = usuarioActual();
        usuarios.cambiarPasswordPropia(u.id, req.actual(), req.nueva());
        return Map.of("ok", true);
    }

    /**
     * IP de origen del intento de login.
     *
     * <p>El rate limit se indexa por correo + IP, así que la IP debe ser la que añade el proxy de
     * confianza: de X-Forwarded-For se toma la ÚLTIMA entrada (el proxy la añade al final) y se
     * descarta el resto, que el cliente puede inventar y rotar para esquivar el bloqueo.
     */
    static String ipCliente(HttpServletRequest req) {
        String reenviada = cabeceraOriginal(req, "X-Forwarded-For");
        if (reenviada != null && !reenviada.isBlank()) {
            String[] saltos = reenviada.split(",");
            String ultima = saltos[saltos.length - 1].trim();
            if (!ultima.isEmpty()) return ultima;
        }
        return req.getRemoteAddr();
    }

    /**
     * Con `forward-headers-strategy: framework` Spring oculta las cabeceras reenviadas del request
     * que llega al controlador; se leen del request original para no depender de su reescritura.
     */
    private static String cabeceraOriginal(HttpServletRequest req, String nombre) {
        HttpServletRequest actual = req;
        String valor = actual.getHeader(nombre);
        while (valor == null && actual instanceof ServletRequestWrapper envoltorio) {
            if (!(envoltorio.getRequest() instanceof HttpServletRequest siguiente)) break;
            actual = siguiente;
            valor = actual.getHeader(nombre);
        }
        return valor;
    }

    private Usuario usuarioActual() {
        Claims c = PermisoInterceptor.claims();
        if (c == null || c.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        try {
            Usuario u = usuarios.obtener(UUID.fromString(c.getSubject()));
            if (!u.activo) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Cuenta desactivada");
            }
            return u;
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        } catch (ResponseStatusException e) {
            if (e.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
            }
            throw e;
        }
    }
}
