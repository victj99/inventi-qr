package com.nexo.inventario.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

// SPA: rutas que no son /api ni archivos estáticos sirven index.html (Angular hash routing).
@Controller
public class SpaController {
    @RequestMapping(value = {
            "/",
            "/login",
            "/inicio",
            "/inventario",
            "/auditoria",
            "/alertas",
            "/etiquetas",
            "/reportes",
            "/activo/**"
    })
    public String spa() {
        return "forward:/index.html";
    }
}
