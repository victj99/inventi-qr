package com.nexo.inventario.services;

import com.nexo.inventario.domain.Usuario;
import com.nexo.inventario.repositories.UsuarioRepository;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Reglas de negocio de las cuentas. Centraliza validaciones, guardas de seguridad y cierre de
 * sesiones para que el controlador solo traduzca HTTP.
 */
@Service
@Transactional
public class UsuarioService {

    public static final List<String> ROLES =
            List.of("administrador", "tecnico", "colaborador", "consulta");
    public static final String ADMINISTRADOR = "administrador";

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final int PASSWORD_MIN = 8;
    private static final int NOMBRE_MAX = 255;
    private static final int EMAIL_MAX = 255;

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;

    public UsuarioService(UsuarioRepository usuarios, PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.encoder = encoder;
    }

    public record CrearReq(
            @NotBlank(message = "obligatorio")
                    @Size(max = 80, message = "máximo 80 caracteres")
                    String nombre,
            @NotBlank(message = "obligatorio")
                    @Email(message = "correo no válido")
                    @Size(max = 120, message = "máximo 120 caracteres")
                    String email,
            @NotBlank(message = "obligatorio") String rol,
            @NotBlank(message = "obligatorio")
                    @Size(min = 8, max = 100, message = "entre 8 y 100 caracteres")
                    String password) {
    }

    /** Edición parcial: los campos ausentes no se tocan, así que no son obligatorios. */
    public record EditarReq(
            @Size(max = 80, message = "máximo 80 caracteres") String nombre,
            @Email(message = "correo no válido")
                    @Size(max = 120, message = "máximo 120 caracteres")
                    String email,
            @Size(max = 20, message = "máximo 20 caracteres") String rol,
            Boolean activo) {
    }

    public record Actor(UUID id, String nombre) {
    }

    @Transactional(readOnly = true)
    public List<Usuario> listar() {
        return usuarios.findAll().stream()
                .sorted(
                        Comparator.comparing((Usuario u) -> !u.activo)
                                .thenComparing(
                                        u -> u.nombre == null ? "" : u.nombre,
                                        String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public Usuario obtener(UUID id) {
        return usuarios
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    /** Valida credenciales, rechaza cuentas inactivas y registra el último acceso. */
    public Usuario autenticar(String email, String password) {
        String correo = normalizarEmail(email);
        if (correo.isEmpty() || password == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos");
        }
        Usuario u =
                usuarios
                        .findByEmail(correo)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED,
                                                "Correo o contraseña incorrectos"));
        if (!u.activo) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Cuenta desactivada. Contacta a TI.");
        }
        if (u.passwordHash == null || !encoder.matches(password, u.passwordHash)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos");
        }
        u.ultimoAcceso = Instant.now();
        return usuarios.save(u);
    }

    public Usuario crear(CrearReq req, Actor actor) {
        String nombre = validarNombre(req.nombre());
        String email = validarEmailDisponible(req.email(), null);
        String rol = validarRol(req.rol());
        String password = validarPassword(req.password());

        Usuario u = new Usuario();
        u.nombre = nombre;
        u.email = email;
        u.rol = rol;
        u.passwordHash = encoder.encode(password);
        u.activo = true;
        u.creadoEn = Instant.now();
        u.tokenVersion = 0;
        return usuarios.save(u);
    }

    public Usuario editar(UUID id, EditarReq req, Actor actor) {
        Usuario u = obtener(id);
        boolean self = esMismoUsuario(u, actor);

        String nombre = req.nombre() == null ? null : validarNombre(req.nombre());
        String email =
                req.email() == null ? null : normalizarEmail(req.email());
        String rol = req.rol() == null ? null : validarRol(req.rol());
        Boolean activo = req.activo();

        if (email != null && email.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El correo no es válido.");
        }
        if (email != null && !email.equals(u.email)) {
            if (self) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Pide a otro administrador que cambie tu correo.");
            }
            validarEmailDisponible(email, u.id);
        }
        if (rol != null && !rol.equals(u.rol) && self) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "No puedes cambiar tu propio rol.");
        }
        if (Boolean.FALSE.equals(activo) && self) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "No puedes desactivar tu propia cuenta.");
        }

        String rolFinal = rol == null ? u.rol : rol;
        boolean activoFinal = activo == null ? u.activo : activo;
        boolean eraAdminActivo = u.activo && ADMINISTRADOR.equals(u.rol);
        boolean seraAdminActivo = activoFinal && ADMINISTRADOR.equals(rolFinal);
        if (eraAdminActivo
                && !seraAdminActivo
                && usuarios.countByRolAndActivoTrue(ADMINISTRADOR) <= 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Debe existir al menos un administrador activo.");
        }

        boolean dirty = false;
        boolean cerrarSesiones = false;

        if (nombre != null && !nombre.equals(u.nombre)) {
            u.nombre = nombre;
            dirty = true;
        }
        if (email != null && !email.equals(u.email)) {
            u.email = email;
            dirty = true;
            cerrarSesiones = true;
        }
        if (rol != null && !rol.equals(u.rol)) {
            u.rol = rol;
            dirty = true;
            cerrarSesiones = true;
        }
        if (activo != null && activo != u.activo) {
            u.activo = activo;
            dirty = true;
            cerrarSesiones = true;
        }
        if (cerrarSesiones) {
            u.tokenVersion++;
        }
        return dirty ? usuarios.save(u) : u;
    }

    public void resetPassword(UUID id, String password) {
        Usuario u = obtener(id);
        String nueva = validarPassword(password);
        u.passwordHash = encoder.encode(nueva);
        u.passwordActualizadoEn = Instant.now();
        u.tokenVersion++;
        usuarios.save(u);
    }

    public Usuario actualizarPerfil(UUID id, String nombre) {
        Usuario u = obtener(id);
        String limpio = validarNombre(nombre);
        u.nombre = limpio;
        return usuarios.save(u);
    }

    public void cambiarPasswordPropia(UUID id, String actual, String nueva) {
        Usuario u = obtener(id);
        if (actual == null
                || u.passwordHash == null
                || !encoder.matches(actual, u.passwordHash)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "La contraseña actual no es correcta.");
        }
        String limpia = validarPassword(nueva);
        if (encoder.matches(limpia, u.passwordHash)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "La nueva contraseña debe ser diferente a la actual.");
        }
        u.passwordHash = encoder.encode(limpia);
        u.passwordActualizadoEn = Instant.now();
        u.tokenVersion++;
        usuarios.save(u);
    }

    private boolean esMismoUsuario(Usuario u, Actor actor) {
        return actor != null && actor.id() != null && actor.id().equals(u.id);
    }

    private String validarNombre(String nombre) {
        String limpio = nombre == null ? "" : nombre.trim();
        if (limpio.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre no puede estar vacío.");
        }
        if (limpio.length() > NOMBRE_MAX) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre es demasiado largo.");
        }
        return limpio;
    }

    private String normalizarEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String validarEmailDisponible(String email, UUID idActual) {
        String correo = normalizarEmail(email);
        if (correo.isEmpty()
                || correo.length() > EMAIL_MAX
                || !EMAIL.matcher(correo).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El correo no es válido.");
        }
        usuarios
                .findByEmail(correo)
                .filter(x -> idActual == null || !x.id.equals(idActual))
                .ifPresent(
                        x -> {
                            throw new ResponseStatusException(
                                    HttpStatus.CONFLICT, "Ese correo ya está registrado.");
                        });
        return correo;
    }

    private String validarRol(String rol) {
        String limpio = rol == null ? "" : rol.trim();
        if (!ROLES.contains(limpio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rol no válido.");
        }
        return limpio;
    }

    private String validarPassword(String password) {
        String limpia = password == null ? "" : password;
        if (limpia.length() < PASSWORD_MIN) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La contraseña debe tener al menos 8 caracteres.");
        }
        return limpia;
    }
}
