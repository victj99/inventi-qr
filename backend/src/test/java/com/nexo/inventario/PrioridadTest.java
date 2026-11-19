package com.nexo.inventario;

import static org.junit.jupiter.api.Assertions.*;

import com.nexo.inventario.domain.Activo;
import com.nexo.inventario.domain.Registro;
import com.nexo.inventario.services.Prioridad;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class PrioridadTest {
    private final LocalDate hoy = LocalDate.of(2026, 11, 17);

    private Activo activo(String compra, String garantia) {
        Activo a = new Activo();
        a.codigo = "TI-0001";
        a.compra = compra == null ? null : LocalDate.parse(compra);
        a.garantiaHasta = garantia == null ? null : LocalDate.parse(garantia);
        return a;
    }

    @Test
    void equipoNuevoSinHistorialPrioridadBaja() {
        var r = Prioridad.calcular(activo("2026-01-10", "2028-01-10"), List.of(), hoy);
        assertEquals("baja", r.nivel());
        assertTrue(r.score() < 25);
    }

    @Test
    void equipoViejoConFallasYGarantiaVencidaSube() {
        Activo a = activo("2019-05-01", "2022-05-01");
        Registro f = new Registro();
        f.tipo = "falla";
        f.estado = "cerrada";
        f.cerradaEn = hoy.minusDays(10).atStartOfDay().toInstant(ZoneOffset.UTC);
        Registro m = new Registro();
        m.tipo = "mantenimiento";
        m.costo = new BigDecimal("300");
        var r = Prioridad.calcular(a, List.of(f, m), hoy);
        assertTrue(r.score() >= 50);
        assertEquals("alta", r.nivel());
        assertTrue(r.factores().stream().anyMatch(x -> x.contains("Antigüedad")));
        assertTrue(r.factores().stream().anyMatch(x -> x.contains("Garantía vencida")));
        assertTrue(r.factores().stream().anyMatch(x -> x.contains("fallas cerradas")));
    }

    @Test
    void sinFechaCompraSumaPendiente() {
        var r = Prioridad.calcular(activo(null, null), List.of(), hoy);
        assertTrue(r.factores().stream().anyMatch(x -> x.contains("Sin fecha de compra")));
    }

    @Test
    void fallasAntiguasNoCuentan() {
        Activo a = activo("2025-01-01", "2027-01-01");
        Registro f = new Registro();
        f.tipo = "falla";
        f.estado = "cerrada";
        f.cerradaEn = hoy.minusDays(120).atStartOfDay().toInstant(ZoneOffset.UTC);
        var r = Prioridad.calcular(a, List.of(f), hoy);
        assertTrue(r.factores().stream().noneMatch(x -> x.contains("fallas cerradas")));
    }
}
