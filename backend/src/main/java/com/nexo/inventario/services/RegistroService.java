package com.nexo.inventario.services;

import com.nexo.inventario.domain.Activo;
import com.nexo.inventario.domain.Registro;
import com.nexo.inventario.repositories.RegistroRepository;
import io.jsonwebtoken.Claims;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Escrituras de registros (fallas y mantenimientos) en una sola transacción: registro, historial
 * del activo y estado operativo se confirman juntos o no se confirma ninguno.
 */
@Service
public class RegistroService {

    private final RegistroRepository registros;
    private final ActivoService activos;

    public RegistroService(RegistroRepository registros, ActivoService activos) {
        this.registros = registros;
        this.activos = activos;
    }

    @Transactional(readOnly = true)
    public Registro obtener(UUID id) {
        return registros
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro no encontrado"));
    }

    @Transactional
    public Registro crear(
            UUID activoId,
            String tipo,
            String descripcion,
            String tecnico,
            BigDecimal costo,
            LocalDate proxima,
            Claims autor) {
        if (!"falla".equals(tipo) && !"mantenimiento".equals(tipo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo inválido");
        }
        activos.obtener(activoId);

        Registro r = new Registro();
        r.id = UUID.randomUUID();
        r.activoId = activoId;
        r.tipo = tipo;
        r.estado = "abierta";
        r.fecha = Instant.now();
        r.descripcion = descripcion;
        r.tecnico = tecnico;
        r.costo = costo;
        r.proxima = proxima;
        registros.save(r);

        activos.entrada(activoId, autor, "Registro de " + tipo, "", r.descripcion);
        if ("falla".equals(tipo)) {
            activos.editar(activoId, Map.of("estadoOp", "averiado"), autor, "Falla reportada");
        }
        return r;
    }

    @Transactional
    public Registro cerrar(UUID id, Claims autor) {
        Registro r = obtener(id);
        if (!"abierta".equals(r.estado)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El registro ya está cerrado.");
        }
        r.estado = "cerrada";
        r.cerradaEn = Instant.now();
        registros.save(r);

        activos.entrada(r.activoId, autor, "Cierre de " + r.tipo, "abierta", "cerrada");
        if ("falla".equals(r.tipo)) {
            Activo a = activos.obtener(r.activoId);
            if ("averiado".equals(a.estadoOp))
                activos.editar(r.activoId, Map.of("estadoOp", "operativo"), autor, "Falla resuelta");
        }
        return r;
    }
}
