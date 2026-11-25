const fs = require('fs');
const path = require('path');
const { SB, CATS, POL, NOINDEX, bslug, esc, q, all, STORE } = require('./_lib');
const POLHTML = require('./_pol.json');

let TPL = null;
const tpl = () => (TPL ||= fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8'));
const SUF=' | Malta Cosméticos';
function cutW(t,max){t=String(t).trim();if(t.length<=max)return t;let x=t.slice(0,max+1);const sp=x.lastIndexOf(' ');x=sp>10?x.slice(0,sp):t.slice(0,max);
 for(let k=0;k<3;k++)x=x.replace(/[\s,;:+\-–|/(]+$/,'').replace(/\s+(com|de|da|do|das|dos|e|para|em|a|o|à|ao|na|no|por|sem)$/i,'').replace(/\s+[A-Za-zÀ-ÿ]{1,2}$/,'');return x}
function fitTitle(main,suffix=SUF,max=60){main=String(main||'').replace(/\s+/g,' ').trim();
 if((main+suffix).length<=max)return main+suffix;if(main.length<=max)return main;
 if(/\s\+\s/.test(main))return cutW(main,max);
 let head=main,tail='';const sep=main.match(/^(.*\S)\s+[-–]\s+([^-–]{1,24})$/);
 if(sep){head=sep[1];tail=sep[2]}else{const w=main.split(' ');let k=w.length-1;tail=w[k];if(!/\d/.test(tail)&&k>0&&/\d/.test(w[k-1])&&(w[k-1]+' '+tail).length<=22){tail=w[k-1]+' '+tail;k--}head=w.slice(0,k).join(' ')}
 if(tail.length>24)return cutW(main,max);
 return cutW(head,max-tail.length-1)+' '+tail}

const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const plain = (t) => String(t || '').replace(/#+|\*\*+/g, ' ').replace(/\s+/g, ' ').trim();
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t);
let BRANDS = null, BRANDS_AT = 0;
async function brands() {
  if (BRANDS && Date.now() - BRANDS_AT < 3600e3) return BRANDS;
  const rows = await all('produtos?select=marca&ativo=eq.true&marca=not.is.null');
  const m = new Map();
  for (const r of rows) m.set(r.marca, (m.get(r.marca) || 0) + 1);
  BRANDS = m; BRANDS_AT = Date.now();
  return m;
}
function page(base, { title, desc, canonical, image, jsonld = [], body = '', noindex = false, type = 'website' }) {
  let h = tpl();
  const T = esc(title), D = esc(desc);
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${T}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${D}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(canonical)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${T}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${D}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(canonical)}">`)
    .replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${type}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image || base + '/assets/og.jpg')}">`);
  const extra = (noindex ? '<meta name="robots" content="noindex, follow">\n' : '<meta name="robots" content="index, follow, max-image-preview:large">\n') +
    jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n');
  h = h.replace('</head>', extra + '\n</head>');
  if (body) h = h.replace(/<main id="app">[\s\S]*?<\/main>/, `<main id="app">${body}</main>`);
  return h;
}
const org = (base) => ({
  '@context': 'https://schema.org', '@type': 'OnlineStore', '@id': base + '/#loja', name: STORE.name, legalName: STORE.legal, url: base + '/',
  logo: base + '/assets/logo.webp', image: base + '/assets/og.jpg', taxID: STORE.cnpj, email: STORE.email, telephone: STORE.phone,
  address: { '@type': 'PostalAddress', streetAddress: STORE.street, addressLocality: STORE.city, addressRegion: STORE.uf, postalCode: STORE.cep, addressCountry: 'BR' },
  contactPoint: { '@type': 'ContactPoint', telephone: STORE.phone, contactType: 'customer service', availableLanguage: 'Portuguese' },
});
const crumbs = (base, list) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: base + u })) });
const cardList = (rows) => `<div class="grid" id="g">${rows.map((p) => `<article class="card"><a class="thumb" href="/produto/${esc(p.slug)}">${p.imagem_url ? `<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}" loading="lazy" style="width:100%;height:100%;object-fit:contain;background:#fff">` : ''}</a><div class="info"><span class="brand">${esc(p.marca || '')}</span><a class="name" href="/produto/${esc(p.slug)}">${esc(p.nome)}</a><div class="price"><b>${brl(p.preco)}</b></div></div></article>`).join('')}</div>`;

module.exports = async (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const base = `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const raw = String(req.query.p || '').replace(/^\/+|\/+$/g, '');
  const key = decodeURIComponent(raw.split('?')[0]);
  const send = (status, html, cache = 's-maxage=3600, stale-while-revalidate=86400') => {
    res.statusCode = status; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', cache); res.end(html);
  };
  try {
    let m;
    if ((m = key.match(/^produto\/([a-z0-9-]+)$/))) {
      const [p] = await q(`produtos?select=id,slug,nome,titulo_seo,marca,descricao,preco,estoque,imagem_url,imagens,sku,ean,categoria_id&slug=eq.${encodeURIComponent(m[1])}&ativo=eq.true`);
      if (!p) return send(404, page(base, { title: 'Produto não encontrado | Malta Cosméticos', desc: 'Este produto não está mais disponível.', canonical: base + '/' + key, noindex: true }), 's-maxage=300');
      const cat = CATS.find((c) => c[0] === p.categoria_id) || CATS[0];
      const url = `${base}/produto/${p.slug}`;
      const imgs = (p.imagens || []).map((f) => `${SB}/storage/v1/object/public/produtos/${f}`);
      const d = plain(p.descricao);
      const desc = cut(`${p.nome}${p.marca ? ' – ' + p.marca : ''}. ${d || 'Produto original com envio para todo o Brasil.'}`, 158);
      const prod = {
        '@context': 'https://schema.org', '@type': 'Product', name: p.nome, image: imgs.length ? imgs : [p.imagem_url].filter(Boolean),
        description: cut(d || p.nome, 4900), sku: p.sku || undefined, gtin13: p.ean && /^\d{13}$/.test(p.ean) ? p.ean : undefined,
        gtin: p.ean && /^\d{8,14}$/.test(p.ean) ? p.ean : undefined, brand: p.marca ? { '@type': 'Brand', name: p.marca } : undefined, category: cat[1],
        offers: {
          '@type': 'Offer', url, priceCurrency: 'BRL', price: Number(p.preco).toFixed(2), itemCondition: 'https://schema.org/NewCondition',
          availability: p.estoque > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', seller: { '@id': base + '/#loja' },
          shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: Number(p.preco) >= 199 ? 0 : 19.9, currency: 'BRL' },
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BR' },
            deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' }, transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 9, unitCode: 'DAY' } } },
          hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'BR', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 7, returnMethod: 'https://schema.org/ReturnByMail', returnFees: 'https://schema.org/FreeReturn' },
        },
      };
      const body = `<section class="band"><div class="wrap"><nav class="crumb"><a href="/">Início</a> › <a href="/${cat[0]}">${esc(cat[1])}</a>${p.marca ? ` › <a href="/marca/${bslug(p.marca)}">${esc(p.marca)}</a>` : ''}</nav>
<div class="pdp"><div>${imgs[0] || p.imagem_url ? `<img src="${esc(imgs[0] || p.imagem_url)}" alt="${esc(p.nome)}" style="width:100%;max-width:520px;aspect-ratio:1;object-fit:contain;background:#fff;border-radius:20px">` : ''}</div>
<div><span class="brand">${esc(p.marca || cat[1])}</span><h1>${esc(p.nome)}</h1><div class="price"><div class="big">${brl(p.preco)}</div></div>${Math.min(6,Math.floor(p.preco/10))>1?`<p class="pix">ou ${Math.min(6,Math.floor(p.preco/10))}x de ${brl(p.preco/Math.min(6,Math.floor(p.preco/10)))} sem juros no cartão</p>`:''}
<h2 style="font-size:22px">Descrição</h2><p>${esc(cut(d, 1500))}</p></div></div></div></section>`;
      return send(200, page(base, { title: p.titulo_seo || fitTitle(p.nome), desc, canonical: url, image: imgs[0] || p.imagem_url, type: 'product', body,
        jsonld: [org(base), prod, crumbs(base, [['Início', '/'], [cat[1], '/' + cat[0]], ...(p.marca ? [[p.marca, '/marca/' + bslug(p.marca)]] : []), [p.nome, '/produto/' + p.slug]])] }));
    }
    const cat = CATS.find((c) => c[0] === key);
    if (cat) {
      const rows = await q(`produtos?select=slug,nome,marca,preco,imagem_url&categoria_id=eq.${cat[0]}&ativo=eq.true&order=id&limit=48`);
      const body = `<section class="band"><div class="wrap"><div class="sec-h"><h1 style="font-size:34px;margin:0">${esc(cat[1])}</h1></div><p class="pix">${esc(cat[2])}</p>${cardList(rows)}</div></section>`;
      return send(200, page(base, { title: fitTitle(`${cat[1]} originais com entrega no Brasil`), desc: cut(cat[2] + ' Compre na Malta Cosméticos.', 158), canonical: `${base}/${cat[0]}`, body,
        jsonld: [org(base), crumbs(base, [['Início', '/'], [cat[1], '/' + cat[0]]]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: cat[1], url: `${base}/${cat[0]}`, mainEntity: { '@type': 'ItemList', itemListElement: rows.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}/produto/${p.slug}` })) } }] }));
    }
    if ((m = key.match(/^marca\/([a-z0-9-]+)$/))) {
      const b = [...(await brands()).keys()].find((x) => bslug(x) === m[1]);
      if (!b) return send(404, page(base, { title: 'Marca não encontrada | Malta Cosméticos', desc: 'Marca não encontrada.', canonical: base + '/' + key, noindex: true }), 's-maxage=300');
      const rows = await q(`produtos?select=slug,nome,marca,preco,imagem_url&marca=eq.${encodeURIComponent(b)}&ativo=eq.true&order=id&limit=60`);
      const body = `<section class="band"><div class="wrap"><div class="sec-h"><h1 style="font-size:34px;margin:0">${esc(b)}</h1></div>${cardList(rows)}</div></section>`;
      return send(200, page(base, { title: fitTitle(`${b}: produtos originais`), desc: cut(`Compre produtos ${b} originais na Malta Cosméticos: ${rows.slice(0, 3).map((r) => r.nome).join(', ')}. Envio para todo o Brasil.`, 158), canonical: `${base}/marca/${m[1]}`, body,
        jsonld: [org(base), crumbs(base, [['Início', '/'], ['Marcas', '/marcas'], [b, '/marca/' + m[1]]])] }));
    }
    if (POL[key]) {
      const body = key !== 'rastreio' && POLHTML[key] ? POLHTML[key].split('__HOST__').join(esc(req.headers['x-forwarded-host'] || req.headers.host)) : '';
      return send(200, page(base, { title: fitTitle(POL[key]), desc: `${POL[key]} da Malta Cosméticos – ${STORE.legal}, CNPJ ${STORE.cnpj}, ${STORE.city}/${STORE.uf}.`, canonical: `${base}/${key}`, jsonld: [org(base)], noindex: key === 'rastreio', body }));
    }
    if (NOINDEX.has(key)) {
      return send(200, page(base, { title: 'Malta Cosméticos', desc: 'Malta Cosméticos', canonical: `${base}/${key}`, noindex: true }), 'no-store');
    }
    return send(404, page(base, { title: 'Página não encontrada | Malta Cosméticos', desc: 'Página não encontrada.', canonical: base + '/' + key, noindex: true }), 's-maxage=300');
  } catch (e) {
    return send(200, tpl(), 'no-store');
  }
};
