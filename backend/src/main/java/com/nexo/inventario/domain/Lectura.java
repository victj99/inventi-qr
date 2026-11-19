package com.nexo.inventario.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "lecturas")
@IdClass(Lectura.LecturaId.class)
public class Lectura {

    @Id
    public UUID auditoriaId;
    @Id
    public UUID activoId;
    public Instant leidaEn = Instant.now();
    public String origen = "Código";

    public static class LecturaId implements Serializable {
        public UUID auditoriaId;
        public UUID activoId;

        public LecturaId() {
        }

        public LecturaId(UUID auditoriaId, UUID activoId) {
            this.auditoriaId = auditoriaId;
            this.activoId = activoId;
        }

        @Override
        public boolean equals(Object o) {
            if (!(o instanceof LecturaId other))
                return false;
            return Objects.equals(auditoriaId, other.auditoriaId)
                    && Objects.equals(activoId, other.activoId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(auditoriaId, activoId);
        }
    }
}
