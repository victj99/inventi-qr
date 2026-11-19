package com.nexo.inventario;

import static org.junit.jupiter.api.Assertions.*;

import com.nexo.inventario.security.Permisos;
import org.junit.jupiter.api.Test;

class PermisosTest {
    @Test
    void administradorPuedeTodo() {
        for (String accion :
                new String[] {
                    "ver",
                    "crear",
                    "editar",
                    "asignar",
                    "baja",
                    "auditar",
                    "importar",
                    "exportar",
                    "etiquetas",
                    "panel",
                    "historial"
                }) {
            assertTrue(Permisos.can("administrador", accion), accion);
        }
    }

    @Test
    void colaboradorSoloVeYReportaFallas() {
        assertTrue(Permisos.can("colaborador", "ver"));
        assertTrue(Permisos.can("colaborador", "falla"));
        assertFalse(Permisos.can("colaborador", "crear"));
        assertFalse(Permisos.can("colaborador", "editar"));
        assertFalse(Permisos.can("colaborador", "auditar"));
        assertFalse(Permisos.can("colaborador", "exportar"));
    }

    @Test
    void consultaNoModifica() {
        assertTrue(Permisos.can("consulta", "ver"));
        assertTrue(Permisos.can("consulta", "exportar"));
        assertFalse(Permisos.can("consulta", "editar"));
        assertFalse(Permisos.can("consulta", "crear"));
        assertFalse(Permisos.can("consulta", "falla"));
    }

    @Test
    void tecnicoNoCreaNiDaDeBaja() {
        assertTrue(Permisos.can("tecnico", "editar"));
        assertTrue(Permisos.can("tecnico", "auditar"));
        assertFalse(Permisos.can("tecnico", "crear"));
        assertFalse(Permisos.can("tecnico", "baja"));
        assertFalse(Permisos.can("tecnico", "importar"));
    }

    @Test
    void soloAdministradorGestionaUsuarios() {
        assertTrue(Permisos.can("administrador", "usuarios"));
        assertFalse(Permisos.can("tecnico", "usuarios"));
        assertFalse(Permisos.can("colaborador", "usuarios"));
        assertFalse(Permisos.can("consulta", "usuarios"));
    }

    @Test
    void rolDesconocidoSinPermisos() {
        assertFalse(Permisos.can("intruso", "ver"));
        assertFalse(Permisos.can(null, "ver"));
    }
}
