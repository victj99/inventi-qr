package com.nexo.inventario.controllers;

import com.nexo.inventario.domain.Registro;
import com.nexo.inventario.repositories.RegistroRepository;
import com.nexo.inventario.security.PermisoInterceptor;
import com.nexo.inventario.security.Permisos;
import com.nexo.inventario.security.PermisosManuales;
import com.nexo.inventario.security.RequirePermiso;
import com.nexo.inventario.services.RegistroService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/registros")
@PermisosManuales
public class RegistroController {

    private final RegistroRepository registros;
    private final RegistroService service;

    public RegistroController(RegistroRepository registros, RegistroService service) {
        this.registros = registros;
        this.service = service;
    }

    public record CrearRegistroReq(
            @NotNull(message = "obligatorio")
                    UUID activoId,
            @NotBlank(message = "obligatorio")
                    @Pattern(regexp = "falla|mantenimiento", message = "debe ser falla o mantenimiento")
                    String tipo,
            @Size(max = 2000, message = "máximo 2000 caracteres")
                    String descripcion,
            @Size(max = 120, message = "máximo 120 caracteres")
                    String tecnico,
            BigDecimal costo,
            LocalDate proxima) {
    }

    @GetMapping
    @RequirePermiso("ver")
    public List<Registro> listar(@RequestParam(required = false) UUID activoId) {
        return activoId == null ? registros.findAll() : registros.findByActivoId(activoId);
    }

    /**
     * El permiso depende del tipo. @Valid comprueba el tipo ANTES de resolver el permiso: un valor
     * inválido responde 400 y nunca se trata como "falla".
     */
    @PostMapping
    public Registro crear(@Valid @RequestBody CrearRegistroReq req) {
        exigirPermiso(req.tipo());
        return service.crear(
                req.activoId(),
                req.tipo(),
                req.descripcion(),
                req.tecnico(),
                req.costo(),
                req.proxima(),
                PermisoInterceptor.claims());
    }

    @PostMapping("/{id}/cerrar")
    public Registro cerrar(@PathVariable UUID id) {
        Registro r = service.obtener(id);
        exigirPermiso(r.tipo);
        return service.cerrar(id, PermisoInterceptor.claims());
    }

    private static void exigirPermiso(String tipo) {
        String permiso = "mantenimiento".equals(tipo) ? "mantenimiento" : "falla";
        if (!Permisos.can(PermisoInterceptor.rol(), permiso)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu rol no permite esta acción");
        }
    }
}
