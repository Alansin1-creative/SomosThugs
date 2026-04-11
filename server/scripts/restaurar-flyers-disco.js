#!/usr/bin/env node
/**
 * Restaura archivos de flyers en disco según las rutas guardadas en Mongo.
 * Útil tras un redeploy en Render (disco efímero) si tenés una carpeta backup
 * con los mismos nombres de archivo (ej. flyer_1775587873986_59faad5e13bf.jpg).
 *
 * Uso (desde la carpeta server/):
 *   node scripts/restaurar-flyers-disco.js --origen "C:\ruta\backup-flyers"
 *   node scripts/restaurar-flyers-disco.js --origen ./backup-flyers --dry-run
 *
 * Requiere MONGODB_URI en server/.env (o en el entorno).
 * No crea ni borra documentos en Mongo: solo copia bytes al destino.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Flyer = require('../models/Flyer');

const UPLOADS_FLYERS = path.join(__dirname, '..', 'uploads', 'flyers');

function normalizarUrlImagenFlyer(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (s.includes('/uploads/flyer_') && !s.includes('/uploads/flyers/')) {
    return s.replace('/uploads/flyer_', '/uploads/flyers/flyer_');
  }
  return s;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = { origen: '', dryRun: false, soloActivos: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--origen' && argv[i + 1]) {
      out.origen = argv[++i];
    } else if (argv[i] === '--dry-run') {
      out.dryRun = true;
    } else if (argv[i] === '--solo-activos') {
      out.soloActivos = true;
    }
  }
  return out;
}

function nombreArchivoDesdeUrl(urlImagen) {
  const u = normalizarUrlImagenFlyer(urlImagen);
  const base = path.basename(u);
  return base || null;
}

async function main() {
  const { origen, dryRun, soloActivos } = parseArgs();
  if (!origen) {
    console.error('Falta --origen <carpeta> con los JPG/PNG (mismo nombre que en Mongo).');
    process.exit(1);
  }
  const origenAbs = path.resolve(process.cwd(), origen);
  if (!fs.existsSync(origenAbs)) {
    console.error('No existe la carpeta origen:', origenAbs);
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI en .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const filtro = soloActivos ? { activo: true } : {};
  const docs = await Flyer.find(filtro).select('urlImagen titulo activo').lean();
  console.log(`Flyers en Mongo: ${docs.length} (${soloActivos ? 'solo activos' : 'todos'})`);
  console.log(`Origen: ${origenAbs}`);
  console.log(`Destino: ${UPLOADS_FLYERS}`);
  console.log(dryRun ? 'MODO dry-run (no escribe archivos)\n' : '');

  if (!dryRun && !fs.existsSync(UPLOADS_FLYERS)) {
    fs.mkdirSync(UPLOADS_FLYERS, { recursive: true });
  }

  let ok = 0;
  let missing = 0;

  for (const d of docs) {
    const nombre = nombreArchivoDesdeUrl(d.urlImagen);
    if (!nombre) {
      console.warn('[sin nombre]', d._id, d.urlImagen);
      missing++;
      continue;
    }
    const src = path.join(origenAbs, nombre);
    const dest = path.join(UPLOADS_FLYERS, nombre);
    if (!fs.existsSync(src)) {
      console.warn('[no está en backup]', nombre);
      missing++;
      continue;
    }
    if (dryRun) {
      console.log('[dry-run] copiaría', nombre, '→', dest);
      ok++;
      continue;
    }
    fs.copyFileSync(src, dest);
    console.log('[ok]', nombre);
    ok++;
  }

  await mongoose.disconnect();
  console.log(`\nResumen: copiados ${ok}, sin archivo en origen o URL rara: ${missing}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
