const { SB, CATS, all } = require('./_lib');
const x = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const plain = (t) => String(t || '').replace(/#+|\*\*+/g, ' ').replace(/\s+/g, ' ').trim();
const cut = (t, n) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '').replace(/[\s,;:+\-–]+$/, '') : t);
const gtinOk = (g) => { if (!/^\d{8}$|^\d{12,14}$/.test(g || '')) return false; const d = g.split('').map(Number); const c = d.pop(); let s = 0; d.reverse().forEach((v, i) => (s += v * (i % 2 ? 1 : 3))); return (10 - (s % 10)) % 10 === c; };
module.exports = async (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const base = `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
  try {
    const rows = await all('produtos?select=id,slug,nome,marca,descricao,preco,estoque,imagem_url,imagens,sku,ean,categoria_id&ativo=eq.true&order=id');
    const items = rows.map((p) => {
      const cat = (CATS.find((c) => c[0] === p.categoria_id) || CATS[0])[1];
      const imgs = (p.imagens || []).map((f) => `${SB}/storage/v1/object/public/produtos/${f}`);
      const main = imgs[0] || p.imagem_url;
      const bundle = /^kit\b/i.test(p.nome) && /\s\+\s/.test(p.nome);
      const ship = Number(p.preco) >= 199 ? '0.00' : '19.90';
      const gtin = gtinOk(p.ean) ? p.ean : null;
      return `<item>
<g:id>${x(p.sku || 'UNI-' + p.id)}</g:id>
<g:title>${x(cut(p.nome, 150))}</g:title>
<g:description>${x(cut(plain(p.descricao) || p.nome, 5000))}</g:description>
<g:link>${x(`${base}/produto/${p.slug}`)}</g:link>
<g:image_link>${x(main)}</g:image_link>
${imgs.slice(1, 11).map((u) => `<g:additional_image_link>${x(u)}</g:additional_image_link>`).join('\n')}
<g:availability>${p.estoque > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
<g:price>${Number(p.preco).toFixed(2)} BRL</g:price>
<g:condition>new</g:condition>
<g:brand>${x(p.marca)}</g:brand>
${gtin ? `<g:gtin>${gtin}</g:gtin>` : '<g:identifier_exists>no</g:identifier_exists>'}
${bundle ? '<g:is_bundle>yes</g:is_bundle>' : ''}
<g:product_type>${x('Saúde e beleza > ' + cat)}</g:product_type>
<g:shipping><g:country>BR</g:country><g:service>PAC</g:service><g:price>${ship} BRL</g:price></g:shipping>
<g:shipping_weight>0.5 kg</g:shipping_weight>
</item>`.replace(/\n\n+/g, '\n');
    });
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n<title>Malta Cosméticos</title>\n<link>${base}/</link>\n<description>Catálogo de produtos da Malta Cosméticos</description>\n${items.join('\n')}\n</channel>\n</rss>`);
  } catch (e) { res.statusCode = 500; res.end('erro'); }
};
