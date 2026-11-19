package com.nexo.inventario.services;

import com.nexo.inventario.domain.Activo;
import com.nexo.inventario.domain.Registro;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

// Índice explicable de prioridad de renovación (sin ML). Pesos documentados en el APF3.
public final class Prioridad {

    // Puntaje máximo alcanzable: 40 antigüedad + 30 fallas + 20 garantía + 20 costo (espejo de PRIORIDAD_MAX en frontend domain.ts).
    public static final int SCORE_MAX = 110;

    public record Resultado(int score, String nivel, List<String> factores) {
    }

    public static Resultado calcular(Activo a, List<Registro> registros, LocalDate hoy) {
        List<String> factores = new ArrayList<>();
        int score = 0;
        if (a.compra != null) {
            long anios = ChronoUnit.YEARS.between(a.compra, hoy);
            int puntos = (int) Math.min(Math.max(anios, 0) * 8, 40);
            if (puntos > 0) {
                score += puntos;
                factores.add("Antigüedad: " + anios + " años (+" + puntos + ")");
            }
        } else {
            score += 5;
            factores.add("Sin fecha de compra registrada (+5)");
        }
        LocalDate limite = hoy.minusDays(90);
        long fallas = registros.stream()
                .filter(
                        r -> "falla".equals(r.tipo)
                                && "cerrada".equals(r.estado)
                                && r.cerradaEn != null
                                && !LocalDate.ofInstant(r.cerradaEn, java.time.ZoneOffset.UTC)
                                        .isBefore(limite))
                .count();
        if (fallas > 0) {
            int puntos = (int) Math.min(fallas * 15, 30);
            score += puntos;
            factores.add(fallas + " fallas cerradas en 90 días (+" + puntos + ")");
        }
        if (a.garantiaHasta != null) {
            if (a.garantiaHasta.isBefore(hoy)) {
                score += 20;
                factores.add("Garantía vencida el " + a.garantiaHasta + " (+20)");
            } else if (!a.garantiaHasta.isAfter(hoy.plusDays(30))) {
                score += 10;
                factores.add("Garantía vence el " + a.garantiaHasta + " (+10)");
            }
        }
        BigDecimal costo = registros.stream()
                .filter(r -> "mantenimiento".equals(r.tipo) && r.costo != null)
                .map(r -> r.costo)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (costo.signum() > 0) {
            int puntos = (int) Math.min(costo.intValue() / 50 * 5, 20);
            if (puntos > 0) {
                score += puntos;
                factores.add("Costo acumulado de mantenimientos: S/ " + costo + " (+" + puntos + ")");
            }
        }
        String nivel = score >= 50 ? "alta" : score >= 25 ? "media" : "baja";
        if (factores.isEmpty())
            factores.add("Sin factores de riesgo registrados");
        return new Resultado(score, nivel, factores);
    }

    private Prioridad() {
    }
}
