import { Platform } from 'react-native';
import seo from '../config/seo.json';

function setMetaName(name, content) {
  if (typeof document === 'undefined' || content == null) return;
  const safe = String(name).replace(/[^a-zA-Z0-9:_\-]/g, '');
  if (!safe) return;
  let el = document.querySelector(`meta[name="${safe}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', String(content));
}

function setMetaProperty(property, content) {
  if (typeof document === 'undefined' || content == null) return;
  const safe = String(property).replace(/[^a-zA-Z0-9:_\-]/g, '');
  if (!safe) return;
  let el = document.querySelector(`meta[property="${safe}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', String(content));
}

function setLinkRel(rel, href) {
  if (typeof document === 'undefined' || !href) return;
  const safe = String(rel).replace(/[^a-zA-Z0-9:_\-]/g, '');
  if (!safe) return;
  let el = document.querySelector(`link[rel="${safe}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', String(href));
}













/** Verificación / vinculación de cuenta AdSense en <head> (solo web). */
export function aplicarMetaCuentaAdSense(idCliente) {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || !idCliente) return;
  setMetaName('google-adsense-account', String(idCliente).trim());
}

export function aplicarSeoWeb(opts = {}) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const titulo = opts.titulo ?? seo.defaultTitle;
  const descripcion = opts.descripcion ?? seo.defaultDescription;
  const ogTitulo = opts.ogTitulo ?? titulo;
  const ogDescripcion = opts.ogDescripcion ?? descripcion;

  document.title = titulo;
  setMetaName('description', descripcion);
  setMetaProperty('og:site_name', seo.siteName);
  setMetaProperty('og:type', seo.ogType);
  setMetaProperty('og:title', ogTitulo);
  setMetaProperty('og:description', ogDescripcion);
  setMetaName('twitter:card', seo.twitterCard);
  setMetaName('twitter:title', ogTitulo);
  setMetaName('twitter:description', ogDescripcion);

  if (opts.canonicalUrl) setLinkRel('canonical', opts.canonicalUrl);
  if (opts.ogImagen) {
    setMetaProperty('og:image', opts.ogImagen);
    setMetaName('twitter:image', opts.ogImagen);
  }
}


export function tituloSeo(parte) {
  const sep = seo.titleSeparator || ' | ';
  if (!parte) return seo.defaultTitle;
  return `${parte}${sep}${seo.siteName}`;
}

export { seo };