package com.nexo.inventario.security;

import java.util.List;
import java.util.Map;

// Misma matriz que inventario-ti-qr/src/permisos.js y src/app/permisos.ts (fuente única de verdad).
public final class Permisos {

    public static final Map<String, List<String>> P = Map.of(
            "administrador",
            List.of(
                    "ver",
                    "historial",
                    "crear",
                    "editar",
                    "asignar",
                    "estado",
                    "falla",
                    "mantenimiento",
                    "baja",
                    "auditar",
                    "importar",
                    "exportar",
                    "etiquetas",
                    "panel",
                    "usuarios"),
            "tecnico",
            List.of(
                    "ver",
                    "historial",
                    "editar",
                    "asignar",
                    "estado",
                    "falla",
                    "mantenimiento",
                    "auditar",
                    "exportar",
                    "etiquetas",
                    "panel"),
            "colaborador", List.of("ver", "falla"),
            "consulta", List.of("ver", "historial", "panel", "exportar"));

    public static boolean can(String rol, String accion) {
        return rol != null && P.getOrDefault(rol, List.of()).contains(accion);
    }

    private Permisos() {
    }
}
