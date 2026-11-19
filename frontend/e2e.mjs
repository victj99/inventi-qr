import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.E2E_BASE || 'http://localhost:4200';
// Carpeta capturas del workspace (hermana de inventi-qr), sin ruta absoluta.
// fileURLToPath decodifica los acentos del pathname (%CC%81 en "innovación").
const CAP =
  process.env.E2E_CAPTURAS || fileURLToPath(new URL('../../capturas/', import.meta.url));
mkdirSync(CAP, { recursive: true });
const PASS = 'InvenTI2026!';
const CODIGO = 'TI-E2E-' + String(Date.now()).slice(-6);
const USUARIO_EMAIL = 'e2e-' + String(Date.now()).slice(-6) + '@inventi.pe';
const USUARIO_EMAIL_EDITADO = 'e2e-edit-' + String(Date.now()).slice(-6) + '@inventi.pe';
const USUARIO_NOMBRE = 'Prueba E2E';
const USUARIO_NOMBRE_EDITADO = 'Prueba E2E Editada';
const USUARIO_NOMBRE_FINAL = 'Prueba E2E Final';
const USUARIO_CLAVE = 'InvenTI2027!';
let failures = 0;
const ok = (cond, msg) => {
  console.log((cond ? '✔' : '✘') + ' ' + msg);
  if (!cond) failures++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const shot = async (name, fullPage = true) => {
  await page.screenshot({ path: `${CAP}/${name}.png`, fullPage });
};
const login = async (email, password = PASS) => {
  if (!page.url().endsWith('/#/login')) await page.goto(BASE + '/#/login');
  await page.waitForSelector('h2:has-text("Inicia sesión")');
  for (let i = 0; i < 6; i++) {
    await page.fill('input[name=email]', email);
    await page.fill('input[name=password]', password);
    await page.waitForTimeout(300);
    if (!(await page.locator('button[type=submit]').isDisabled())) {
      await page.waitForTimeout(200);
      if (!(await page.locator('button[type=submit]').isDisabled())) break;
    }
  }
  await page.click('button[type=submit]');
  await page.waitForURL(/#\/(inicio|activo)/, { timeout: 15000 });
};

// 1. Deep link sin sesión → login.
await page.goto(BASE + '/#/inventario');
await page.waitForURL(/#\/login/, { timeout: 10000 });
ok(page.url().includes('login'), 'sin sesión redirige a login');
await shot('01-login');

// 2. Login admin (formulario real).
await login('admin@inventi.pe');
ok(page.url().includes('inicio'), 'login admin entra al inicio');
await page.waitForSelector('.kpi');
await page.waitForTimeout(1200);
ok((await page.locator('.kpi').count()) === 4, 'dashboard muestra 4 indicadores');
await shot('02-dashboard');

// 3. Inventario carga datos reales y los filtros no truncan.
await page.goto(BASE + '/#/inventario');
await page.waitForSelector('table tbody tr');
const rows = await page.locator('table tbody tr').count();
ok(rows >= 10, `inventario muestra activos reales (${rows})`);
const filtro = await page.locator('.filters select').first().evaluate((el) => el.getBoundingClientRect().width);
ok(filtro >= 120, 'filtros con ancho legible');
await shot('03-inventario');

// 3b. Importación CSV (una fila nueva).
const codigoImport = 'TI-IMP-' + String(Date.now()).slice(-5);
const csv = [
  'codigo,tipo,marca,modelo,serie,compra,garantiaHasta,ubicacion,responsable',
  `${codigoImport},Monitor,QA,Importado,IMP-${codigoImport},2024-01-01,2027-01-01,Almacén,QA Import`,
].join('\n');
const csvPath = '/tmp/inventi-import-e2e.csv';
writeFileSync(csvPath, csv);
await page.setInputFiles('input[type=file]', csvPath);
await page.waitForTimeout(1600);
ok((await page.locator('table tbody tr', { hasText: codigoImport }).count()) === 1, 'importación CSV agrega el activo');

// 4. Crear activo nuevo.
await page.goto(BASE + '/#/activo-nuevo');
await page.fill('input[name=codigo]', CODIGO);
await page.fill('input[name=marca]', 'Marca E2E');
await page.fill('input[name=modelo]', 'Modelo E2E');
await page.fill('input[name=serie]', 'SERIE-' + CODIGO);
await page.fill('input[name=ubicacion]', 'Administración');
await page.click('button[type=submit]');
await page.waitForURL(/#\/activo\//, { timeout: 15000 });
ok(page.url().includes('activo/'), 'alta de activo navega a la ficha');
await page.waitForTimeout(700);
await shot('04-ficha');

// 5. Ficha muestra QR generado en runtime.
const qrSrc = await page.locator('.qr-panel img').getAttribute('src');
ok(!!qrSrc && qrSrc.startsWith('data:image'), 'QR generado en runtime (data URL)');

// 6. Asignar responsable.
await page.click('button:has-text("Asignar")');
await page.fill('input[name=responsable]', 'Persona E2E');
await page.click('button:has-text("Confirmar asignación")');
await page.waitForTimeout(900);
const respTxt = await page.textContent('.asset-details');
ok(respTxt.includes('Persona E2E'), 'asignación guarda responsable');

// 7. Registrar una falla.
await page.click('button:has-text("Registrar")');
await page.fill('input[name=descripcion]', 'Falla de prueba E2E');
await page.click('button:has-text("Guardar")');
await page.waitForTimeout(900);
ok((await page.textContent('body')).includes('Falla de prueba E2E'), 'falla registrada visible en ficha');

// 7b. Editar el activo (PATCH) y volver a la ficha.
await page.click('a:has-text("Editar")');
await page.waitForURL(/#\/activo-editar\//);
await page.waitForFunction(
  () => document.querySelector('input[name=marca]')?.value === 'Marca E2E',
  { timeout: 8000 },
);
await page.fill('input[name=marca]', 'Marca Editada');
await page.click('button[type=submit]');
await page.waitForURL(/#\/activo\//, { timeout: 15000 });
await page.waitForTimeout(700);
ok((await page.textContent('body')).includes('Marca Editada'), 'edición del activo se refleja en la ficha');

// 8. Auditoría: iniciar, lectura manual, sincronizar, cerrar.
await page.goto(BASE + '/#/auditoria');
await page.selectOption('select', 'Administración');
await page.click('button:has-text("Iniciar auditoría")');
await page.waitForTimeout(1000);
const listaPreview = await page.textContent('body');
ok(listaPreview.includes(CODIGO), 'la preparación lista los equipos de la ubicación');
await page.fill('#asset-code', CODIGO);
await page.click('button[aria-label="Registrar código"]');
await page.waitForTimeout(900);
const bodyTxt = await page.textContent('body');
ok(bodyTxt.includes(CODIGO), 'lectura manual registrada en auditoría');
await shot('05-auditoria');
const syncBtn = page.locator('button:has-text("Confirmar lecturas")');
if (await syncBtn.isEnabled()) {
  await syncBtn.click();
  await page.waitForTimeout(900);
}
await page.check('input[type=checkbox]');
await page.click('button:has-text("Cerrar auditoría")');
await page.waitForTimeout(1200);
const cerradaTxt = await page.textContent('body');
ok(cerradaTxt.includes('Preparar auditoría') || cerradaTxt.includes('Auditorías anteriores'), 'auditoría cerrada vuelve al inicio');

// 9. Etiquetas y reportes.
await page.goto(BASE + '/#/etiquetas');
await page.waitForTimeout(1600);
ok((await page.locator('.label img').count()) > 0, 'etiquetas QR generadas');
await shot('06-etiquetas');
await page.goto(BASE + '/#/reportes');
await page.waitForTimeout(500);
ok((await page.textContent('body')).includes('Centro de reportes'), 'centro de reportes visible');
const [descarga] = await Promise.all([
  page.waitForEvent('download'),
  page.click('button:has-text("Descargar Excel")'),
]);
ok(descarga.suggestedFilename().endsWith('.xlsx'), 'reporte Excel descargado');
await page.waitForTimeout(1200);
await shot('07-reportes');
await page.goto(BASE + '/#/alertas');
await page.waitForTimeout(500);
ok((await page.locator('.alert-item').count()) > 0, 'alertas listadas con su nivel');
await shot('08-alertas');

// 9b. El escáner QR abre y cierra sin errores.
await page.goto(BASE + '/#/inicio');
await page.click('button[aria-label="Consultar equipo por QR"]');
await page.waitForSelector('dialog[open]', { timeout: 8000 });
ok((await page.textContent('dialog')).includes('Escanear código QR'), 'modal de escaneo QR abre');
await page.click('button[aria-label="Cerrar escáner"]');
await page.waitForTimeout(400);

// 10. Rol colaborador: no puede crear ni auditar.
await page.goto(BASE + '/#/inicio');
await page.click('button:has-text("Cerrar sesión")');
await page.waitForURL(/#\/login/);
await login('colaborador@inventi.pe');
await page.goto(BASE + '/#/inventario');
await page.waitForTimeout(700);
ok((await page.locator('a:has-text("Nuevo activo")').count()) === 0, 'colaborador no ve botón Nuevo activo');
ok((await page.locator('.sidebar nav a:has-text("Auditoría")').count()) === 0, 'colaborador no ve nav Auditoría');
await shot('09-colaborador');

// 10b. Rol consulta: solo lectura, sin etiquetas ni auditoría.
await page.goto(BASE + '/#/inicio');
await page.click('button:has-text("Cerrar sesión")');
await page.waitForURL(/#\/login/);
await login('consulta@inventi.pe');
await page.goto(BASE + '/#/inventario');
await page.waitForTimeout(700);
ok((await page.locator('button:has-text("Excel")').count()) === 1, 'consulta puede exportar Excel');
ok((await page.locator('a:has-text("Etiquetas QR")').count()) === 0, 'consulta no ve etiquetas');
ok((await page.locator('.sidebar nav a:has-text("Reportes")').count()) === 1, 'consulta ve reportes');

// 11. Offline: lectura queda pendiente y se conserva.
await page.goto(BASE + '/#/inicio');
await page.click('button:has-text("Cerrar sesión")');
await page.waitForURL(/#\/login/);
await login('tecnico@inventi.pe');
await page.goto(BASE + '/#/auditoria');
await page.selectOption('select', 'Administración');
await page.click('button:has-text("Iniciar auditoría")');
await page.waitForTimeout(900);
await ctx.setOffline(true);
await page.fill('#asset-code', 'TI-0001');
await page.click('button[aria-label="Registrar código"]');
await page.waitForTimeout(700);
const offTxt = await page.textContent('body');
ok(offTxt.includes('pendiente'), 'offline: lectura queda pendiente de confirmar');
await shot('10-offline');
await ctx.setOffline(false);
await page.waitForTimeout(1600);
await page.click('button:has-text("Confirmar lecturas")').catch(() => {});
await page.waitForTimeout(1200);

// 12. Móvil: barra inferior, hoja «Más», sin desbordes.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/#/inicio');
await page.waitForTimeout(700);
const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(desborde <= 1, `móvil sin desborde horizontal (${desborde}px)`);
ok(await page.locator('.sidebar').isHidden(), 'móvil oculta la barra lateral');
const tabbar = page.locator('.tabbar');
ok(await tabbar.isVisible(), 'móvil muestra la barra inferior');
const tabBox = await tabbar.boundingBox();
ok(!!tabBox && Math.abs(tabBox.y + tabBox.height - 844) <= 1, 'barra inferior pegada al borde inferior');
ok((await tabbar.locator('a').count()) === 4, 'barra inferior con 4 secciones + Más');
await shot('11-movil', false);
await tabbar.locator('a:has-text("Inventario")').click();
await page.waitForURL(/#\/inventario/);
await page.waitForSelector('table tbody tr');
ok(true, 'pestaña Inventario navega desde la barra inferior');
const desbordeInv = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(desbordeInv <= 1, `inventario móvil sin desborde horizontal (${desbordeInv}px)`);
await page.locator('.tab-more').click();
await page.waitForSelector('dialog[open]');
const masTxt = await page.textContent('dialog');
ok(masTxt.includes('Etiquetas') && masTxt.includes('Reportes'), 'hoja Más lista las secciones secundarias');
ok((await page.locator('dialog button:has-text("Cerrar sesión")').count()) === 1, 'hoja Más ofrece cerrar sesión');
await page.waitForTimeout(350);
await shot('14-movil-mas', false);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
ok((await page.locator('dialog[open]').count()) === 0, 'Escape cierra la hoja Más');
await page.locator('.tab-more').click();
await page.waitForSelector('dialog[open]');
await page.click('dialog a:has-text("Etiquetas")');
await page.waitForURL(/#\/etiquetas/);
await page.waitForTimeout(500);
ok((await page.locator('dialog[open]').count()) === 0, 'la hoja Más se cierra al navegar');
ok((await page.locator('.tab-more.active').count()) === 1, 'la pestaña Más se marca en secciones secundarias');
for (const ancho of [360, 320]) {
  await page.setViewportSize({ width: ancho, height: 740 });
  await page.goto(BASE + '/#/inicio');
  await page.waitForTimeout(400);
  const d = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(d <= 1, `sin desborde horizontal a ${ancho}px (${d}px)`);
}

// 13. Administración de usuarios: crear, editar, desactivar y reactivar.
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(BASE + '/#/inicio');
await page.click('button:has-text("Cerrar sesión")');
await page.waitForURL(/#\/login/);
await login('admin@inventi.pe');
await page.click('.sidebar nav a:has-text("Usuarios")');
await page.waitForSelector('h1:has-text("Usuarios y roles")', { timeout: 10000 });
await page.waitForSelector('table tbody tr:has-text("Rosa Villanueva")', { timeout: 10000 });
await page.click('button:has-text("Nuevo usuario")');
await page.locator('.inline-form input[name=nombre]').fill(USUARIO_NOMBRE);
await page.locator('.inline-form input[name=email]').fill(USUARIO_EMAIL);
await page.locator('.inline-form select[name=rol]').selectOption('colaborador');
await page.locator('.inline-form input[name=password]').fill(PASS);
await page.locator('.inline-form input[name=passwordConfirmar]').fill(PASS);
await page.click('button:has-text("Crear usuario")');
await page.waitForSelector(`table tbody tr:has-text("${USUARIO_EMAIL}")`, { timeout: 10000 });
ok(
  (await page.locator('table tbody tr', { hasText: USUARIO_EMAIL }).count()) === 1,
  'admin crea un usuario',
);
await shot('12-usuarios');

// 13b. Búsqueda y filtros de la lista.
await page.fill('input[name=buscarUsuario]', 'Rosa');
await page.waitForTimeout(350);
ok((await page.locator('table tbody tr').count()) === 1, 'búsqueda por nombre filtra la lista');
await page.click('button:has-text("Limpiar filtros")');
await page.waitForTimeout(350);

// 13c. Editar nombre, correo y rol desde el modal.
let filaUsuario = page.locator('table tbody tr', { hasText: USUARIO_EMAIL });
await filaUsuario.getByRole('button', { name: 'Editar' }).click();
await page.waitForSelector('#editar-usuario-title');
await page.locator('input[name=editNombre]').fill(USUARIO_NOMBRE_EDITADO);
await page.locator('input[name=editEmail]').fill(USUARIO_EMAIL_EDITADO);
await page.locator('select[name=editRol]').selectOption('tecnico');
await page.click('button:has-text("Guardar cambios")');
await page.waitForSelector(`table tbody tr:has-text("${USUARIO_EMAIL_EDITADO}")`, {
  timeout: 10000,
});
ok(
  (await page.locator('table tbody tr', { hasText: USUARIO_EMAIL_EDITADO }).count()) === 1,
  'admin edita nombre, correo y rol',
);

// 13d. Desactivar la cuenta e impedir el login.
filaUsuario = page.locator('table tbody tr', { hasText: USUARIO_EMAIL_EDITADO });
await filaUsuario.getByRole('button', { name: 'Editar' }).click();
await page.waitForSelector('#editar-usuario-title');
await page.click('button:has-text("Desactivar cuenta")');
await page.waitForSelector('#desactivar-title');
await page.locator('dialog[open]').getByRole('button', { name: 'Desactivar cuenta' }).click();
await page.waitForSelector(`table tbody tr:has-text("${USUARIO_EMAIL_EDITADO}")`);
await page.waitForTimeout(400);
ok(
  (await page.locator('table tbody tr', { hasText: USUARIO_EMAIL_EDITADO }).textContent()).includes(
    'Inactiva',
  ),
  'admin desactiva la cuenta',
);

await page.goto(BASE + '/#/inicio');
await page.click('button:has-text("Cerrar sesión")');
await page.waitForURL(/#\/login/);
await page.waitForSelector('input[name=email]');
await page.waitForTimeout(700);
await page.locator('input[name=email]').fill(USUARIO_EMAIL_EDITADO);
await page.locator('input[name=password]').fill(PASS);
await page.locator('button[type=submit]').click();
await page.waitForSelector('.error-banner', { timeout: 10000 });
ok(
  (await page.textContent('.error-banner')).includes('desactivada'),
  'una cuenta desactivada no puede iniciar sesión',
);

// 13e. Reactivar la cuenta.
await login('admin@inventi.pe');
await page.click('.sidebar nav a:has-text("Usuarios")');
await page.waitForSelector(`table tbody tr:has-text("${USUARIO_EMAIL_EDITADO}")`);
filaUsuario = page.locator('table tbody tr', { hasText: USUARIO_EMAIL_EDITADO });
await filaUsuario.getByRole('button', { name: 'Editar' }).click();
await page.waitForSelector('#editar-usuario-title');
await page.click('button:has-text("Reactivar cuenta")');
await page.waitForTimeout(700);
ok(
  (await page.locator('table tbody tr', { hasText: USUARIO_EMAIL_EDITADO }).textContent()).includes(
    'Activa',
  ),
  'admin reactiva la cuenta',
);

// 14. El usuario creado entra con su rol y sin permisos de administración.
await page.goto(BASE + '/#/inicio');
await page.click('button:has-text("Cerrar sesión")');
await page.waitForURL(/#\/login/);
await login(USUARIO_EMAIL_EDITADO);
await page.waitForTimeout(900);
const navUsuarios = await page.locator('.sidebar nav a:has-text("Usuarios")').count();
const navInventario = await page.locator('.sidebar nav a:has-text("Inventario")').count();
const navAuditoria = await page.locator('.sidebar nav a:has-text("Auditoría")').count();
ok(
  navUsuarios === 0 && navInventario === 1 && navAuditoria === 1,
  'usuario nuevo entra como técnico, sin Usuarios y con Auditoría',
);
await shot('13-usuario-nuevo');

// 14b. Mi perfil: cambiar el nombre propio.
await page.locator('.sidebar .profile').click();
await page.waitForSelector('#perfil-title');
await page.locator('input[name=perfilNombre]').fill(USUARIO_NOMBRE_FINAL);
await page.click('button:has-text("Guardar datos")');
await page.waitForTimeout(700);
ok(
  (await page.locator('.sidebar .profile').textContent()).includes(USUARIO_NOMBRE_FINAL),
  'el usuario actualiza su propio nombre',
);

// 14c. Mi contraseña: cambiarla cierra la sesión y la nueva funciona.
await page.locator('.sidebar .profile').click();
await page.waitForSelector('#perfil-title');
await shot('18-perfil', false);
await page.locator('input[name=perfilActual]').fill(PASS);
await page.locator('input[name=perfilNueva]').fill(USUARIO_CLAVE);
await page.locator('input[name=perfilConfirmar]').fill(USUARIO_CLAVE);
await page.click('button:has-text("Cambiar contraseña")');
await page.waitForURL(/#\/login/, { timeout: 10000 });
await login(USUARIO_EMAIL_EDITADO, USUARIO_CLAVE);
ok(true, 'el usuario cambia su contraseña y entra con la nueva');

// 14d. La cuenta administradora no puede cambiarse el rol a sí misma desde la UI.
await page.goto(BASE + '/#/inicio');
await page.click('button:has-text("Cerrar sesión")');
await page.waitForURL(/#\/login/);
await login('admin@inventi.pe');
await page.click('.sidebar nav a:has-text("Usuarios")');
await page.waitForSelector('table tbody tr:has-text("Rosa Villanueva")');
const filaAdmin = page.locator('table tbody tr', { hasText: 'Rosa Villanueva' });
await filaAdmin.getByRole('button', { name: 'Editar' }).click();
await page.waitForSelector('#editar-usuario-title');
ok(
  (await page.locator('select[name=editRol]').isDisabled()) &&
    (await page.locator('input[name=editEmail]').isDisabled()),
  'la cuenta propia no permite editar correo ni rol desde la administración',
);
await page.locator('dialog[open] button[aria-label=Cerrar]').click();
await page.waitForTimeout(400);

// 14e. La tabla de usuarios se adapta al móvil sin desbordes.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/#/usuarios');
await page.waitForSelector('table tbody tr:has-text("Rosa Villanueva")');
const desbordeUsuarios = await page.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);
ok(desbordeUsuarios <= 1, `usuarios móvil sin desborde horizontal (${desbordeUsuarios}px)`);
ok(
  await page.locator('.user-table tbody tr').first().isVisible(),
  'usuarios móvil muestra las cuentas en tarjetas',
);
await shot('19-usuarios-movil', false);
await page.setViewportSize({ width: 1280, height: 900 });

ok(errores.length === 0, `sin errores de página (${errores.slice(0, 2).join(' | ') || 'ninguno'})`);

await browser.close();
console.log(failures ? `\n${failures} FALLOS` : '\nE2E COMPLETO SIN FALLOS');
process.exit(failures ? 1 : 0);
