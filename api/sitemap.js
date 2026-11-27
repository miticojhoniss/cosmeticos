const { CATS, POL, bslug, all } = require('./_lib');
module.exports = async (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const base = 'https://maltacosmeticos.online';
  const today = new Date().toISOString().slice(0, 10);
  const u = (loc, pri, freq, img) => `<url><loc>${base}${loc}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority>${img ? `<image:image><image:loc>${img.replace(/&/g, '&amp;')}</image:loc></image:image>` : ''}</url>`;
  try {
    const rows = await all('produtos?select=slug,marca,imagem_url&ativo=eq.true&order=id');
    const brands = [...new Set(rows.map((r) => r.marca).filter(Boolean))];
    const urls = [u('/', '1.0', 'daily'), ...CATS.map((c) => u('/' + c[0], '0.9', 'daily')), u('/marcas', '0.6', 'weekly'),
      ...brands.map((b) => u('/marca/' + bslug(b), '0.6', 'weekly')),
      ...rows.map((r) => u('/produto/' + r.slug, '0.8', 'weekly', r.imagem_url)),
      ...Object.keys(POL).filter((k) => !['marcas', 'rastreio'].includes(k)).map((k) => u('/' + k, '0.3', 'monthly'))];
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`);
  } catch (e) {
    res.statusCode = 500; res.end('erro');
  }
};
