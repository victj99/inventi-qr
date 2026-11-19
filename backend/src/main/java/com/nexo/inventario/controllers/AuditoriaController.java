package com.nexo.inventario.controllers;

import com.nexo.inventario.domain.Activo;
import com.nexo.inventario.domain.Auditoria;
import com.nexo.inventario.domain.Lectura;
import com.nexo.inventario.repositories.ActivoRepository;
import com.nexo.inventario.repositories.AuditoriaRepository;
import com.nexo.inventario.repositories.LecturaRepository;
import com.nexo.inventario.security.PermisoInterceptor;
import com.nexo.inventario.security.RequirePermiso;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class AuditoriaController {

    private final AuditoriaRepository auditorias;
    private final LecturaRepository lecturas;
    private final ActivoRepository activos;

    public AuditoriaController(
            AuditoriaRepository auditorias, LecturaRepository lecturas, ActivoRepository activos) {
        this.auditorias = auditorias;
        this.lecturas = lecturas;
        this.activos = activos;
    }

    public record IniciarReq(
            @NotBlank(message = "obligatorio")
                    @Size(max = 120, message = "máximo 120 caracteres")
                    String ubicacion) {
    }

    public record LecturaItem(
            @NotNull(message = "obligatorio") UUID activoId,
            Instant leidaEn,
            @Size(max = 20, message = "máximo 20 caracteres") String origen) {
    }

    public record SyncReq(
            @NotNull(message = "obligatorio") UUID auditoriaId,
            @NotNull(message = "obligatorio")
                    @Size(max = 500, message = "máximo 500 lecturas por lote")
                    @Valid
                    List<LecturaItem> lecturas) {
    }

    @GetMapping("/auditorias")
    @RequirePermiso("auditar")
    public List<Map<String, Object>> listar() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Auditoria a : auditorias.findAllByOrderByInicioDesc()) {
            Map<String, Object> m = new HashMap<>();
            m.put("auditoria", a);
            m.put("lecturas", lecturas.findByAuditoriaId(a.id));
            m.put(
                    "minutos",
                    a.fin == null ? null : (a.fin.toEpochMilli() - a.inicio.toEpochMilli()) / 60000.0);
            out.add(m);
        }
        return out;
    }

    @PostMapping("/auditorias")
    @RequirePermiso("auditar")
    public Auditoria iniciar(@Valid @RequestBody IniciarReq req) {
        var c = PermisoInterceptor.claims();
        Auditoria a = new Auditoria();
        a.ubicacion = req.ubicacion();
        a.autor = UUID.fromString(c.getSubject());
        a.autorNombre = c.get("nombre", String.class);
        // Lista esperada fija al abrir: movimientos posteriores no la alteran.
        a.esperados = activos.findByUbicacion(req.ubicacion()).stream()
                .filter(x -> !"de baja".equals(x.estadoOp))
                .map(x -> x.id)
                .toList();
        return auditorias.save(a);
    }

    @PostMapping("/auditorias/{id}/cerrar")
    @RequirePermiso("auditar")
    @Transactional
    public Auditoria cerrar(@PathVariable UUID id) {
        Auditoria a = obtener(id);
        a.estado = "cerrada";
        a.fin = Instant.now();
        return auditorias.save(a);
    }

    @GetMapping("/auditorias/{id}/resultado")
    @RequirePermiso("auditar")
    public Map<String, Object> resultado(@PathVariable UUID id) {
        Auditoria a = obtener(id);
        List<Lectura> ls = lecturas.findByAuditoriaId(id);
        Set<UUID> leidos = new HashSet<>();
        ls.forEach(l -> leidos.add(l.activoId));
        Map<UUID, Activo> porId = new HashMap<>();
        activos.findAll().forEach(x -> porId.put(x.id, x));
        List<Activo> faltantes = a.esperados.stream()
                .filter(x -> !leidos.contains(x))
                .map(porId::get)
                .filter(Objects::nonNull)
                .toList();
        List<Activo> adicionales = ls.stream()
                .map(l -> porId.get(l.activoId))
                .filter(x -> x != null && !a.esperados.contains(x.id))
                .toList();
        long ok = ls.stream().filter(l -> a.esperados.contains(l.activoId)).count();
        return Map.of(
                "faltantes",
                faltantes,
                "adicionales",
                adicionales,
                "ok",
                ok,
                "esperados",
                a.esperados.size());
    }

    // RF09: sincronización idempotente. Reenviar el mismo lote no duplica lecturas
    // (PK compuesta).
    @PostMapping("/sync")
    @RequirePermiso("auditar")
    @Transactional
    public Map<String, Object> sync(@Valid @RequestBody SyncReq req) {
        Auditoria a = obtener(req.auditoriaId());
        if (!"abierta".equals(a.estado))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La auditoría ya está cerrada");
        Instant ahora = Instant.now();
        for (LecturaItem item : req.lecturas()) {
            if (item.leidaEn() != null && item.leidaEn().isAfter(ahora))
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "La fecha de lectura no puede estar en el futuro");
        }
        int nuevas = 0;
        for (LecturaItem item : req.lecturas()) {
            if (activos.findById(item.activoId()).isEmpty())
                continue;
            if (lecturas.existsById(new Lectura.LecturaId(a.id, item.activoId())))
                continue;
            Lectura l = new Lectura();
            l.auditoriaId = a.id;
            l.activoId = item.activoId();
            l.leidaEn = item.leidaEn() == null ? Instant.now() : item.leidaEn();
            l.origen = item.origen() == null ? "Código" : item.origen();
            lecturas.save(l);
            nuevas++;
        }
        return Map.of("nuevas", nuevas, "total", lecturas.countByAuditoriaId(a.id));
    }

    private Auditoria obtener(UUID id) {
        return auditorias
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Auditoría no encontrada"));
    }
}
