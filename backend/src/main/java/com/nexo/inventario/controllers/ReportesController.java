package com.nexo.inventario.controllers;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nexo.inventario.domain.*;
import com.nexo.inventario.repositories.ActivoRepository;
import com.nexo.inventario.repositories.AuditoriaRepository;
import com.nexo.inventario.repositories.LecturaRepository;
import com.nexo.inventario.repositories.RegistroRepository;
import com.nexo.inventario.security.PermisoInterceptor;
import com.nexo.inventario.security.RequirePermiso;
import jakarta.servlet.http.HttpServletResponse;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/reportes")
public class ReportesController {

    private final ActivoRepository activos;
    private final RegistroRepository registros;
    private final AuditoriaRepository auditorias;
    private final LecturaRepository lecturas;

    public ReportesController(
            ActivoRepository activos,
            RegistroRepository registros,
            AuditoriaRepository auditorias,
            LecturaRepository lecturas) {
        this.activos = activos;
        this.registros = registros;
        this.auditorias = auditorias;
        this.lecturas = lecturas;
    }

    private boolean ocultaResponsable() {
        return "consulta".equals(PermisoInterceptor.rol());
    }

    @GetMapping("/inventario.xlsx")
    @RequirePermiso("exportar")
    public void inventario(@RequestParam(required = false) String ubicacion, HttpServletResponse res)
            throws Exception {
        res.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=inventario.xlsx");
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet("Inventario");
            String[] cols = ocultaResponsable()
                    ? new String[] {
                            "Código",
                            "Tipo",
                            "Marca",
                            "Modelo",
                            "Serie",
                            "Compra",
                            "Garantía",
                            "Ubicación",
                            "Estado",
                            "Asignación"
                    }
                    : new String[] {
                            "Código",
                            "Tipo",
                            "Marca",
                            "Modelo",
                            "Serie",
                            "Compra",
                            "Garantía",
                            "Ubicación",
                            "Responsable",
                            "Estado",
                            "Asignación"
                    };
            var head = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++)
                head.createCell(i).setCellValue(cols[i]);
            int r = 1;
            for (Activo a : activos.findAll()) {
                if (ubicacion != null && !ubicacion.isBlank() && !ubicacion.equals(a.ubicacion))
                    continue;
                var row = sheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(a.codigo);
                row.createCell(c++).setCellValue(n(a.tipo));
                row.createCell(c++).setCellValue(n(a.marca));
                row.createCell(c++).setCellValue(n(a.modelo));
                row.createCell(c++).setCellValue(n(a.serie));
                row.createCell(c++).setCellValue(a.compra == null ? "" : a.compra.toString());
                row.createCell(c++)
                        .setCellValue(a.garantiaHasta == null ? "sin fecha" : a.garantiaHasta.toString());
                row.createCell(c++).setCellValue(n(a.ubicacion));
                if (!ocultaResponsable())
                    row.createCell(c++).setCellValue(n(a.responsable));
                row.createCell(c++).setCellValue(a.estadoOp);
                row.createCell(c).setCellValue(a.asignacion);
            }
            wb.write(res.getOutputStream());
        }
    }

    @GetMapping("/registros.xlsx")
    @RequirePermiso("exportar")
    public void registros(HttpServletResponse res) throws Exception {
        res.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=fallas-mantenimientos.xlsx");
        Map<UUID, String> codigos = new HashMap<>();
        activos.findAll().forEach(a -> codigos.put(a.id, a.codigo));
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet("Registros");
            String[] cols = {
                    "Activo", "Tipo", "Estado", "Fecha", "Descripción", "Técnico", "Costo", "Próxima", "Cerrado"
            };
            var head = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++)
                head.createCell(i).setCellValue(cols[i]);
            int r = 1;
            for (Registro g : registros.findAll()) {
                var row = sheet.createRow(r++);
                row.createCell(0).setCellValue(codigos.getOrDefault(g.activoId, "?"));
                row.createCell(1).setCellValue(n(g.tipo));
                row.createCell(2).setCellValue(n(g.estado));
                row.createCell(3).setCellValue(LocalDate.ofInstant(g.fecha, ZoneOffset.UTC).toString());
                row.createCell(4).setCellValue(n(g.descripcion));
                row.createCell(5).setCellValue(n(g.tecnico));
                row.createCell(6).setCellValue(g.costo == null ? "" : g.costo.toString());
                row.createCell(7).setCellValue(g.proxima == null ? "" : g.proxima.toString());
                row.createCell(8)
                        .setCellValue(
                                g.cerradaEn == null
                                        ? ""
                                        : LocalDate.ofInstant(g.cerradaEn, ZoneOffset.UTC).toString());
            }
            wb.write(res.getOutputStream());
        }
    }

    @GetMapping("/garantias.xlsx")
    @RequirePermiso("exportar")
    public void garantias(HttpServletResponse res) throws Exception {
        res.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=garantias.xlsx");
        LocalDate hoy = LocalDate.now();
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet("Garantías");
            String[] cols = { "Código", "Tipo", "Ubicación", "Garantía hasta", "Situación" };
            var head = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++)
                head.createCell(i).setCellValue(cols[i]);
            int r = 1;
            for (Activo a : activos.findAll()) {
                String situacion = a.garantiaHasta == null
                        ? "Sin fecha registrada"
                        : a.garantiaHasta.isBefore(hoy)
                                ? "Vencida"
                                : !a.garantiaHasta.isAfter(hoy.plusDays(30)) ? "Vence en 30 días" : "Vigente";
                var row = sheet.createRow(r++);
                row.createCell(0).setCellValue(a.codigo);
                row.createCell(1).setCellValue(n(a.tipo));
                row.createCell(2).setCellValue(n(a.ubicacion));
                row.createCell(3).setCellValue(a.garantiaHasta == null ? "" : a.garantiaHasta.toString());
                row.createCell(4).setCellValue(situacion);
            }
            wb.write(res.getOutputStream());
        }
    }

    @GetMapping("/auditoria-{id}.pdf")
    @RequirePermiso("exportar")
    public void auditoriaPdf(@PathVariable UUID id, HttpServletResponse res) throws Exception {
        Auditoria a = auditorias
                .findById(id)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Auditoría no encontrada"));
        java.util.List<Lectura> ls = lecturas.findByAuditoriaId(id);
        Set<UUID> leidos = new HashSet<>();
        ls.forEach(l -> leidos.add(l.activoId));
        Map<UUID, Activo> porId = new HashMap<>();
        activos.findAll().forEach(x -> porId.put(x.id, x));
        res.setContentType("application/pdf");
        res.setHeader(
                "Content-Disposition",
                "attachment; filename=auditoria-" + nombreArchivo(a.ubicacion) + ".pdf");
        Document doc = new Document(PageSize.A4, 40, 40, 50, 40);
        PdfWriter.getInstance(doc, res.getOutputStream());
        doc.open();
        doc.add(
                new Paragraph(
                        "Reporte de auditoría — " + a.ubicacion,
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16)));
        doc.add(
                new Paragraph("Inicio: " + a.inicio + "   Fin: " + (a.fin == null ? "en curso" : a.fin)));
        doc.add(
                new Paragraph(
                        "Estado: "
                                + a.estado
                                + "   Esperados: "
                                + a.esperados.size()
                                + "   Lecturas: "
                                + ls.size()));
        doc.add(Chunk.NEWLINE);
        PdfPTable t = new PdfPTable(new float[] { 2, 3, 2 });
        t.addCell("Código");
        t.addCell("Activo");
        t.addCell("Resultado");
        for (UUID esp : a.esperados) {
            Activo x = porId.get(esp);
            t.addCell(x == null ? "?" : x.codigo);
            t.addCell(x == null ? "?" : x.tipo + " " + n(x.marca));
            t.addCell(leidos.contains(esp) ? "Verificado" : "FALTANTE");
        }
        for (Lectura l : ls) {
            if (a.esperados.contains(l.activoId))
                continue;
            Activo x = porId.get(l.activoId);
            t.addCell(x == null ? "?" : x.codigo);
            t.addCell(x == null ? "?" : x.tipo + " " + n(x.marca));
            t.addCell("ADICIONAL (otra ubicación)");
        }
        doc.add(t);
        doc.close();
    }

    private static String n(String s) {
        return s == null ? "" : s;
    }

    /** Evita inyección de cabeceras y nombres raros en Content-Disposition. */
    private static String nombreArchivo(String valor) {
        String limpio = valor == null ? "" : valor.replaceAll("[^A-Za-z0-9._-]", "_");
        return limpio.isBlank() ? "sin-ubicacion" : limpio;
    }
}
