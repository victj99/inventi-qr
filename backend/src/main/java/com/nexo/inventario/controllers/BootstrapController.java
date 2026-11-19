package com.nexo.inventario.controllers;

import com.nexo.inventario.domain.Auditoria;
import com.nexo.inventario.repositories.ActivoRepository;
import com.nexo.inventario.repositories.AuditoriaRepository;
import com.nexo.inventario.repositories.HistorialRepository;
import com.nexo.inventario.repositories.LecturaRepository;
import com.nexo.inventario.repositories.RegistroRepository;
import com.nexo.inventario.security.PermisoInterceptor;
import com.nexo.inventario.security.Permisos;
import com.nexo.inventario.security.RequirePermiso;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class BootstrapController {

    private final ActivoRepository activos;
    private final RegistroRepository registros;
    private final HistorialRepository historial;
    private final AuditoriaRepository auditorias;
    private final LecturaRepository lecturas;

    public BootstrapController(
            ActivoRepository activos,
            RegistroRepository registros,
            HistorialRepository historial,
            AuditoriaRepository auditorias,
            LecturaRepository lecturas) {
        this.activos = activos;
        this.registros = registros;
        this.historial = historial;
        this.auditorias = auditorias;
        this.lecturas = lecturas;
    }

    @GetMapping("/bootstrap")
    @RequirePermiso("ver")
    public Map<String, Object> bootstrap() {
        String rol = PermisoInterceptor.rol();
        Map<String, Object> out = new HashMap<>();
        out.put("activos", activos.findAll());
        out.put("registros", registros.findAll());
        List<Map<String, Object>> auds = new ArrayList<>();
        if (Permisos.can(rol, "auditar")) {
            for (Auditoria a : auditorias.findAllByOrderByInicioDesc()) {
                auds.add(Map.of("auditoria", a, "lecturas", lecturas.findByAuditoriaId(a.id)));
            }
        }
        out.put("auditorias", auds);
        out.put("historial", Permisos.can(rol, "historial") ? historial.findAll() : List.of());
        return out;
    }
}
