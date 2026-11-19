package com.nexo.inventario.config;

import com.nexo.inventario.domain.*;
import com.nexo.inventario.repositories.ActivoRepository;
import com.nexo.inventario.repositories.AuditoriaRepository;
import com.nexo.inventario.repositories.LecturaRepository;
import com.nexo.inventario.repositories.RegistroRepository;
import com.nexo.inventario.repositories.UsuarioRepository;
import com.nexo.inventario.services.ActivoService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// Datos demo (portados de inventario-ti-qr/src/store.js). Activar con SEED=true solo la primera vez.
@Component
@ConditionalOnProperty(name = "app.seed", havingValue = "true")
public class Seed implements CommandLineRunner {
    public static final String PASSWORD_DEMO = "InvenTI2026!";
    private final UsuarioRepository usuarios;
    private final ActivoRepository activos;
    private final RegistroRepository registros;
    private final AuditoriaRepository auditorias;
    private final LecturaRepository lecturas;
    private final ActivoService svc;
    private final PasswordEncoder encoder;

    public Seed(
            UsuarioRepository usuarios,
            ActivoRepository activos,
            RegistroRepository registros,
            AuditoriaRepository auditorias,
            LecturaRepository lecturas,
            ActivoService svc,
            PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.activos = activos;
        this.registros = registros;
        this.auditorias = auditorias;
        this.lecturas = lecturas;
        this.svc = svc;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        if (usuarios.count() > 0) {
            System.out.println("Seed de usuarios omitido: ya existen usuarios.");
            if (auditorias.count() == 0 && activos.count() > 0) {
                seedAuditorias(usuarios.findAll().get(0), activos.findAll());
            }
            return;
        }
        String[][] us = {
            {"Rosa Villanueva", "admin@inventi.pe", "administrador"},
            {"Javier Quispe", "tecnico@inventi.pe", "tecnico"},
            {"Claudia Herrera", "colaborador@inventi.pe", "colaborador"},
            {"Fernando Ríos", "consulta@inventi.pe", "consulta"}
        };
        for (int i = 0; i < us.length; i++) {
            String[] u = us[i];
            Usuario x = new Usuario();
            x.nombre = u[0];
            x.email = u[1];
            x.rol = u[2];
            x.passwordHash = encoder.encode(PASSWORD_DEMO);
            x.activo = true;
            x.creadoEn = Instant.now().minus(120L - i * 20L, ChronoUnit.DAYS);
            x.ultimoAcceso = Instant.now().minus(i + 1L, ChronoUnit.HOURS);
            x.passwordActualizadoEn = x.creadoEn;
            x.tokenVersion = 0;
            usuarios.save(x);
        }
        LocalDate h = LocalDate.now();
        Object[][] filas = {
            {
                "Laptop",
                "Dell",
                "Latitude 5420",
                "DL5420-001",
                "2024-03-10",
                20,
                "Administración",
                "Ana Torres",
                "operativo",
                "asignado"
            },
            {
                "Laptop",
                "Lenovo",
                "ThinkPad E14",
                "LN-E14-002",
                "2023-08-02",
                -40,
                "Administración",
                "Luis Ramos",
                "operativo",
                "asignado"
            },
            {
                "Monitor",
                "LG",
                "24MK430H",
                "LG24-003",
                "2024-01-15",
                300,
                "Administración",
                "Ana Torres",
                "operativo",
                "asignado"
            },
            {
                "Impresora",
                "HP",
                "LaserJet M404",
                "HP-M404-004",
                "2022-11-20",
                -200,
                "Administración",
                "",
                "averiado",
                "disponible"
            },
            {
                "Router",
                "TP-Link",
                "Archer C6",
                "TP-C6-005",
                "2024-05-05",
                400,
                "Administración",
                "",
                "operativo",
                "disponible"
            },
            {
                "Lector de mano",
                "Zebra",
                "DS2208",
                "ZB-2208-006",
                "2024-02-02",
                25,
                "Almacén",
                "Pedro Salas",
                "operativo",
                "asignado"
            },
            {
                "Lector de mano",
                "Zebra",
                "DS2208",
                "ZB-2208-007",
                "2024-02-02",
                null,
                "Almacén",
                "",
                "operativo",
                "disponible"
            },
            {
                "Laptop",
                "HP",
                "ProBook 440",
                "HP-440-008",
                "2023-06-18",
                120,
                "Operaciones",
                "Marta Díaz",
                "en mantenimiento",
                "asignado"
            },
            {
                "Monitor",
                "Samsung",
                "S24R350",
                "SM-24-009",
                "2024-04-04",
                350,
                "Operaciones",
                "Marta Díaz",
                "operativo",
                "asignado"
            },
            {
                "Impresora",
                "Epson",
                "L3250",
                "EP-L3250-010",
                "2024-07-07",
                500,
                "Operaciones",
                "",
                "operativo",
                "disponible"
            }
        };
        List<Activo> creados = new java.util.ArrayList<>();
        for (Object[] f : filas) {
            Activo a = new Activo();
            a.tipo = (String) f[0];
            a.marca = (String) f[1];
            a.modelo = (String) f[2];
            a.serie = (String) f[3];
            a.compra = LocalDate.parse((String) f[4]);
            a.garantiaHasta = f[5] == null ? null : h.plusDays((Integer) f[5]);
            a.ubicacion = (String) f[6];
            a.responsable = (String) f[7];
            a.estadoOp = (String) f[8];
            a.asignacion = (String) f[9];
            creados.add(svc.crear(a, null));
        }
        Registro r1 = new Registro();
        r1.activoId = creados.get(3).id;
        r1.tipo = "falla";
        r1.descripcion = "No imprime, atasco de papel recurrente";
        registros.save(r1);
        Registro r2 = new Registro();
        r2.activoId = creados.get(7).id;
        r2.tipo = "mantenimiento";
        r2.descripcion = "Cambio de disco y limpieza";
        r2.tecnico = "Soporte TI";
        r2.costo = new java.math.BigDecimal("120");
        r2.proxima = h.minusDays(2);
        registros.save(r2);

        seedAuditorias(usuarios.findAll().get(0), creados);

        System.out.println("Seed completado: 4 usuarios, 10 activos, 3 auditorías de referencia.");
    }

    private void seedAuditorias(Usuario admin, List<Activo> todos) {
        Instant now = Instant.now();
        // 1. Auditoría Administración: hace 14 días, 18 min de duración
        crearAuditoriaCerrada("Administración", admin, now.minus(14, ChronoUnit.DAYS), 18, todos);
        // 2. Auditoría Almacén: hace 7 días, 22 min de duración
        crearAuditoriaCerrada("Almacén", admin, now.minus(7, ChronoUnit.DAYS), 22, todos);
        // 3. Auditoría Operaciones: hace 2 días, 15 min de duración
        crearAuditoriaCerrada("Operaciones", admin, now.minus(2, ChronoUnit.DAYS), 15, todos);
    }

    private void crearAuditoriaCerrada(String ubicacion, Usuario admin, Instant inicio, int duracionMin, List<Activo> todos) {
        List<UUID> esperados = todos.stream()
                .filter(a -> ubicacion.equals(a.ubicacion) && !"de baja".equals(a.estadoOp))
                .map(a -> a.id)
                .toList();

        Auditoria a = new Auditoria();
        a.ubicacion = ubicacion;
        a.autor = admin.id;
        a.autorNombre = admin.nombre;
        a.inicio = inicio;
        a.fin = inicio.plus(duracionMin, ChronoUnit.MINUTES);
        a.estado = "cerrada";
        a.esperados = new ArrayList<>(esperados);
        auditorias.save(a);

        for (UUID activoId : esperados) {
            Lectura l = new Lectura();
            l.auditoriaId = a.id;
            l.activoId = activoId;
            l.leidaEn = inicio.plus(2, ChronoUnit.MINUTES);
            l.origen = "Cámara";
            lecturas.save(l);
        }
    }
}
