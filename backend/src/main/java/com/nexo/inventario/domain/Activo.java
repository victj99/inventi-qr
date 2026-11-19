package com.nexo.inventario.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "activos")
public class Activo {

    @Id
    public UUID id = UUID.randomUUID();

    @Column(unique = true, nullable = false)
    public String codigo;

    public String tipo;

    public String marca;

    public String modelo;

    @Column(unique = true)
    public String serie;

    public LocalDate compra;

    public LocalDate garantiaHasta;

    public String ubicacion;

    public String responsable;

    @Column(nullable = false)
    public String estadoOp = "operativo";

    @Column(nullable = false)
    public String asignacion = "disponible";

    public Instant creadoEn = Instant.now();
}
