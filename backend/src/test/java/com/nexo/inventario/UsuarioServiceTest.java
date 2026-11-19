package com.nexo.inventario;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nexo.inventario.domain.Usuario;
import com.nexo.inventario.repositories.UsuarioRepository;
import com.nexo.inventario.services.UsuarioService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock UsuarioRepository usuarios;

    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private UsuarioService service;

    @BeforeEach
    void setUp() {
        service = new UsuarioService(usuarios, encoder);
    }

    private Usuario usuario(String nombre, String email, String rol, boolean activo) {
        Usuario u = new Usuario();
        u.nombre = nombre;
        u.email = email;
        u.rol = rol;
        u.activo = activo;
        u.passwordHash = encoder.encode("InvenTI2026!");
        u.tokenVersion = 0;
        return u;
    }

    private UsuarioService.Actor actor(Usuario u) {
        return new UsuarioService.Actor(u.id, u.nombre);
    }

    private UsuarioService.Actor otroActor() {
        return new UsuarioService.Actor(UUID.randomUUID(), "Otra Administradora");
    }

    @Test
    void creaUsuarioConPasswordHasheada() {
        when(usuarios.findByEmail("nuevo@inventi.pe")).thenReturn(Optional.empty());
        when(usuarios.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        Usuario u =
                service.crear(
                        new UsuarioService.CrearReq(
                                "  Nueva Persona ", " Nuevo@Inventi.pe ", "tecnico", "clave1234"),
                        otroActor());

        assertEquals("Nueva Persona", u.nombre);
        assertEquals("nuevo@inventi.pe", u.email);
        assertEquals("tecnico", u.rol);
        assertTrue(u.activo);
        assertNotNull(u.creadoEn);
        assertEquals(0, u.tokenVersion);
        assertTrue(encoder.matches("clave1234", u.passwordHash));
    }

    @Test
    void rechazaCorreoDuplicado() {
        when(usuarios.findByEmail("nuevo@inventi.pe"))
                .thenReturn(Optional.of(usuario("Otra", "nuevo@inventi.pe", "consulta", true)));

        ResponseStatusException e =
                assertThrows(
                        ResponseStatusException.class,
                        () ->
                                service.crear(
                                        new UsuarioService.CrearReq(
                                                "Nueva", "nuevo@inventi.pe", "tecnico", "clave1234"),
                                        otroActor()));

        assertEquals(HttpStatus.CONFLICT.value(), e.getStatusCode().value());
        verify(usuarios, never()).save(any());
    }

    @Test
    void rechazaRolInvalido() {
        when(usuarios.findByEmail("nuevo@inventi.pe")).thenReturn(Optional.empty());

        ResponseStatusException e =
                assertThrows(
                        ResponseStatusException.class,
                        () ->
                                service.crear(
                                        new UsuarioService.CrearReq(
                                                "Nueva", "nuevo@inventi.pe", "superadmin", "clave1234"),
                                        otroActor()));

        assertEquals(HttpStatus.BAD_REQUEST.value(), e.getStatusCode().value());
        verify(usuarios, never()).save(any());
    }

    @Test
    void rechazaContrasenaCorta() {
        when(usuarios.findByEmail("nuevo@inventi.pe")).thenReturn(Optional.empty());

        ResponseStatusException e =
                assertThrows(
                        ResponseStatusException.class,
                        () ->
                                service.crear(
                                        new UsuarioService.CrearReq(
                                                "Nueva", "nuevo@inventi.pe", "tecnico", "corta"),
                                        otroActor()));

        assertEquals(HttpStatus.BAD_REQUEST.value(), e.getStatusCode().value());
        verify(usuarios, never()).save(any());
    }

    @Test
    void editaNombre() {
        Usuario u = usuario("Javier Quispe", "tecnico@inventi.pe", "tecnico", true);
        when(usuarios.findById(u.id)).thenReturn(Optional.of(u));
        when(usuarios.save(u)).thenReturn(u);

        service.editar(
                u.id, new UsuarioService.EditarReq("Javier Q. Actualizado", null, null, null), otroActor());

        assertEquals("Javier Q. Actualizado", u.nombre);
        assertEquals(0, u.tokenVersion);
    }

    @Test
    void editaCorreoYInvalidaSesiones() {
        Usuario u = usuario("Javier Quispe", "tecnico@inventi.pe", "tecnico", true);
        when(usuarios.findById(u.id)).thenReturn(Optional.of(u));
        when(usuarios.findByEmail("javier@inventi.pe")).thenReturn(Optional.empty());
        when(usuarios.save(u)).thenReturn(u);

        service.editar(
                u.id, new UsuarioService.EditarReq(null, "Javier@Inventi.pe", null, null), otroActor());

        assertEquals("javier@inventi.pe", u.email);
        assertEquals(1, u.tokenVersion);
    }

    @Test
    void rechazaCorreoDeOtroUsuario() {
        Usuario u = usuario("Javier Quispe", "tecnico@inventi.pe", "tecnico", true);
        when(usuarios.findById(u.id)).thenReturn(Optional.of(u));
        when(usuarios.findByEmail("admin@inventi.pe"))
                .thenReturn(Optional.of(usuario("Rosa", "admin@inventi.pe", "administrador", true)));

        ResponseStatusException e =
                assertThrows(
                        ResponseStatusException.class,
                        () ->
                                service.editar(
                                        u.id,
                                        new UsuarioService.EditarReq(
                                                null, "admin@inventi.pe", null, null),
                                        otroActor()));

        assertEquals(HttpStatus.CONFLICT.value(), e.getStatusCode().value());
        verify(usuarios, never()).save(any());
    }

    @Test
    void noPermiteCambiarElRolPropio() {
        Usuario admin = usuario("Rosa", "admin@inventi.pe", "administrador", true);
        when(usuarios.findById(admin.id)).thenReturn(Optional.of(admin));

        ResponseStatusException e =
                assertThrows(
                        ResponseStatusException.class,
                        () ->
                                service.editar(
                                        admin.id,
                                        new UsuarioService.EditarReq(
                                                null, null, "consulta", null),
                                        actor(admin)));

        assertEquals(HttpStatus.CONFLICT.value(), e.getStatusCode().value());
        verify(usuarios, never()).save(any());
    }

    @Test
    void noPermiteDesactivarLaCuentaPropia() {
        Usuario admin = usuario("Rosa", "admin@inventi.pe", "administrador", true);
        when(usuarios.findById(admin.id)).thenReturn(Optional.of(admin));

        ResponseStatusException e =
                assertThrows(
                        ResponseStatusException.class,
                        () ->
                                service.editar(
                                        admin.id,
                                        new UsuarioService.EditarReq(
                                                null, null, null, false),
                                        actor(admin)));

        assertEquals(HttpStatus.CONFLICT.value(), e.getStatusCode().value());
        verify(usuarios, never()).save(any());
    }

    @Test
    void noPermiteDegradarAlUltimoAdminActivo() {
        Usuario admin = usuario("Rosa", "admin@inventi.pe", "administrador", true);
        when(usuarios.findById(admin.id)).thenReturn(Optional.of(admin));
        when(usuarios.countByRolAndActivoTrue("administrador")).thenReturn(1L);

        ResponseStatusException e =
                assertThrows(
                        ResponseStatusException.class,
                        () ->
                                service.editar(
                                        admin.id,
                                        new UsuarioService.EditarReq(
                                                null, null, "tecnico", null),
                                        otroActor()));

        assertEquals(HttpStatus.CONFLICT.value(), e.getStatusCode().value());
        verify(usuarios, never()).save(any());
    }

    @Test
    void permiteDegradarAdminSiHayOtroActivo() {
        Usuario admin = usuario("Rosa", "admin@inventi.pe", "administrador", true);
        when(usuarios.findById(admin.id)).thenReturn(Optional.of(admin));
        when(usuarios.countByRolAndActivoTrue("administrador")).thenReturn(2L);
        when(usuarios.save(admin)).thenReturn(admin);

        service.editar(
                admin.id, new UsuarioService.EditarReq(null, null, "tecnico", null), otroActor());

        assertEquals("tecnico", admin.rol);
        assertEquals(1, admin.tokenVersion);
    }

    @Test
    void desactivaCuentaYInvalidaSesiones() {
        Usuario u = usuario("Javier Quispe", "tecnico@inventi.pe", "tecnico", true);
        when(usuarios.findById(u.id)).thenReturn(Optional.of(u));
        when(usuarios.save(u)).thenReturn(u);

        service.editar(u.id, new UsuarioService.EditarReq(null, null, null, false), otroActor());

        assertFalse(u.activo);
        assertEquals(1, u.tokenVersion);
    }

    @Test
    void restablecePasswordEInvalidaSesiones() {
        Usuario u = usuario("Javier Quispe", "tecnico@inventi.pe", "tecnico", true);
        when(usuarios.findById(u.id)).thenReturn(Optional.of(u));
        when(usuarios.save(u)).thenReturn(u);

        service.resetPassword(u.id, "nueva1234");

        assertTrue(encoder.matches("nueva1234", u.passwordHash));
        assertNotNull(u.passwordActualizadoEn);
        assertEquals(1, u.tokenVersion);
    }

    @Test
    void cambiaLaPasswordPropiaConLaActual() {
        Usuario u = usuario("Javier Quispe", "tecnico@inventi.pe", "tecnico", true);
        when(usuarios.findById(u.id)).thenReturn(Optional.of(u));
        when(usuarios.save(u)).thenReturn(u);

        service.cambiarPasswordPropia(u.id, "InvenTI2026!", "nueva1234");

        assertTrue(encoder.matches("nueva1234", u.passwordHash));
        assertNotNull(u.passwordActualizadoEn);
        assertEquals(1, u.tokenVersion);
    }

    @Test
    void rechazaPasswordPropiaConActualIncorrecta() {
        Usuario u = usuario("Javier Quispe", "tecnico@inventi.pe", "tecnico", true);
        when(usuarios.findById(u.id)).thenReturn(Optional.of(u));

        ResponseStatusException e =
                assertThrows(
                        ResponseStatusException.class,
                        () -> service.cambiarPasswordPropia(u.id, "incorrecta", "nueva1234"));

        assertEquals(HttpStatus.BAD_REQUEST.value(), e.getStatusCode().value());
        verify(usuarios, never()).save(any());
    }

    @Test
    void rechazaLoginDeCuentaInactiva() {
        Usuario u = usuario("Javier Quispe", "tecnico@inventi.pe", "tecnico", false);
        when(usuarios.findByEmail("tecnico@inventi.pe")).thenReturn(Optional.of(u));

        ResponseStatusException e =
                assertThrows(
                        ResponseStatusException.class,
                        () -> service.autenticar("tecnico@inventi.pe", "InvenTI2026!"));

        assertEquals(HttpStatus.FORBIDDEN.value(), e.getStatusCode().value());
        verify(usuarios, never()).save(any());
    }

    @Test
    void autenticaYRegistraUltimoAcceso() {
        Usuario u = usuario("Javier Quispe", "tecnico@inventi.pe", "tecnico", true);
        when(usuarios.findByEmail("tecnico@inventi.pe")).thenReturn(Optional.of(u));
        when(usuarios.save(u)).thenReturn(u);

        Usuario autenticado = service.autenticar("Tecnico@Inventi.pe", "InvenTI2026!");

        assertEquals(u.id, autenticado.id);
        assertNotNull(u.ultimoAcceso);
    }
}
