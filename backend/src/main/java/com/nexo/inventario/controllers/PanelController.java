package com.nexo.inventario.controllers;

import com.nexo.inventario.domain.*;
import com.nexo.inventario.repositories.ActivoRepository;
import com.nexo.inventario.repositories.RegistroRepository;
import com.nexo.inventario.security.RequirePermiso;
import com.nexo.inventario.services.Prioridad;
import java.time.LocalDate;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/panel")
public class PanelController {

    private final ActivoRepository activos;
    private final RegistroRepository registros;

    public PanelController(ActivoRepository activos, RegistroRepository registros) {
        this.activos = activos;
        this.registros = registros;
    }

    @GetMapping("/prioridad")
    @RequirePermiso("panel")
    public List<Map<String, Object>> prioridad() {
        LocalDate hoy = LocalDate.now();
        List<Registro> todos = registros.findAll();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Activo a : activos.findAll()) {
            if ("de baja".equals(a.estadoOp))
                continue;
            List<Registro> mios = todos.stream().filter(r -> r.activoId.equals(a.id)).toList();
            Prioridad.Resultado r = Prioridad.calcular(a, mios, hoy);
            out.add(
                    Map.of(
                            "activoId",
                            a.id,
                            "codigo",
                            a.codigo,
                            "score",
                            r.score(),
                            "nivel",
                            r.nivel(),
                            "factores",
                            r.factores()));
        }
        out.sort((x, y) -> Integer.compare((int) y.get("score"), (int) x.get("score")));
        return out;
    }
}