package com.nexo.inventario.controllers;

import com.nexo.inventario.domain.Activo;
import com.nexo.inventario.domain.Historial;
import com.nexo.inventario.repositories.ActivoRepository;
import com.nexo.inventario.repositories.HistorialRepository;
import com.nexo.inventario.security.PermisoInterceptor;
import com.nexo.inventario.security.RequirePermiso;
import com.nexo.inventario.services.ActivoService;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ActivoController {

    private final ActivoService svc;
    private final HistorialRepository historial;
    private final ActivoRepository activos;

    public ActivoController(
            ActivoService svc, HistorialRepository historial, ActivoRepository activos) {
        this.svc = svc;
        this.historial = historial;
        this.activos = activos;
    }

    @GetMapping("/activos")
    @RequirePermiso("ver")
    public List<Activo> listar() {
        return svc.listar();
    }

    @GetMapping("/activos/{id}")
    @RequirePermiso("ver")
    public Activo obtener(@PathVariable UUID id) {
        return svc.obtener(id);
    }

    @PostMapping("/activos")
    @RequirePermiso("crear")
    public Activo crear(@RequestBody Activo datos) {
        return svc.crear(datos, PermisoInterceptor.claims());
    }

    @PatchMapping("/activos/{id}")
    @RequirePermiso("editar")
    public Activo editar(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        String accion = body.get("accion") instanceof String s && !s.isBlank() ? s : "Edición";
        return svc.editar(id, body, PermisoInterceptor.claims(), accion);
    }

    public record AsignarReq(String responsable) {
    }

    @PostMapping("/activos/{id}/asignar")
    @RequirePermiso("asignar")
    public Activo asignar(@PathVariable UUID id, @RequestBody AsignarReq req) {
        return svc.asignar(
                id, req.responsable() == null ? "" : req.responsable(), PermisoInterceptor.claims());
    }

    @PostMapping("/activos/{id}/devolver")
    @RequirePermiso("asignar")
    public Activo devolver(@PathVariable UUID id) {
        return svc.devolver(id, PermisoInterceptor.claims());
    }

    @PostMapping("/activos/{id}/baja")
    @RequirePermiso("baja")
    public Activo baja(@PathVariable UUID id) {
        return svc.baja(id, PermisoInterceptor.claims());
    }

    @GetMapping("/activos/{id}/historial")
    @RequirePermiso("historial")
    public List<Historial> historial(@PathVariable UUID id) {
        return historial.findByActivoIdOrderByFechaDesc(id);
    }

    // RF02: análisis previo de duplicados antes de confirmar la importación.
    @PostMapping("/import/analizar")
    @RequirePermiso("importar")
    public Map<String, Object> analizar(@RequestBody List<Activo> filas) {
        Set<String> series = new HashSet<>(), codigos = new HashSet<>();
        for (Activo a : activos.findAll()) {
            if (a.serie != null && !a.serie.isBlank())
                series.add(a.serie.toLowerCase());
            codigos.add(a.codigo.toLowerCase());
        }
        List<Activo> nuevos = new ArrayList<>(), duplicados = new ArrayList<>();
        for (Activo f : filas) {
            String s = f.serie == null ? "" : f.serie.toLowerCase();
            String c = f.codigo == null ? "" : f.codigo.toLowerCase();
            if ((!s.isEmpty() && series.contains(s)) || (!c.isEmpty() && codigos.contains(c))) {
                duplicados.add(f);
                continue;
            }
            if (!s.isEmpty())
                series.add(s);
            if (!c.isEmpty())
                codigos.add(c);
            nuevos.add(f);
        }
        return Map.of("nuevos", nuevos, "duplicados", duplicados);
    }

    @PostMapping("/import")
    @RequirePermiso("importar")
    public List<Activo> importar(@RequestBody List<Activo> filas) {
        return svc.importar(filas, PermisoInterceptor.claims());
    }
}
