package com.nexo.inventario.controllers;

import com.nexo.inventario.domain.Usuario;
import com.nexo.inventario.security.PermisoInterceptor;
import com.nexo.inventario.security.RequirePermiso;
import com.nexo.inventario.services.UsuarioService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Gestión de usuarios del panel (solo administrador, acción "usuarios"). */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService service;

    public UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @GetMapping
    @RequirePermiso("usuarios")
    public List<Map<String, Object>> listar() {
        return service.listar().stream().map(UsuarioController::vista).toList();
    }

    @PostMapping
    @RequirePermiso("usuarios")
    public Map<String, Object> crear(@Valid @RequestBody UsuarioService.CrearReq req) {
        return vista(service.crear(req, actor()));
    }

    @PatchMapping("/{id}")
    @RequirePermiso("usuarios")
    public Map<String, Object> editar(
            @PathVariable UUID id, @Valid @RequestBody UsuarioService.EditarReq req) {
        return vista(service.editar(id, req, actor()));
    }

    @PostMapping("/{id}/password")
    @RequirePermiso("usuarios")
    public Map<String, Object> cambiarPassword(
            @PathVariable UUID id, @Valid @RequestBody PasswordReq req) {
        service.resetPassword(id, req.password());
        return Map.of("ok", true);
    }

    public record PasswordReq(
            @NotBlank(message = "obligatorio")
                    @Size(min = 8, max = 100, message = "entre 8 y 100 caracteres")
                    String password) {
    }

    private static UsuarioService.Actor actor() {
        Claims c = PermisoInterceptor.claims();
        if (c == null || c.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        try {
            return new UsuarioService.Actor(
                    UUID.fromString(c.getSubject()), c.get("nombre", String.class));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
    }

    static Map<String, Object> vista(Usuario u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.id);
        m.put("nombre", u.nombre);
        m.put("email", u.email);
        m.put("rol", u.rol);
        m.put("activo", u.activo);
        m.put("creadoEn", u.creadoEn);
        m.put("ultimoAcceso", u.ultimoAcceso);
        m.put("passwordActualizadoEn", u.passwordActualizadoEn);
        return m;
    }
}
