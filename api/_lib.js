const SB = 'https://wilralriqtfvklgyjlef.supabase.co';
const KEY = 'sb_publishable_fO0oCD_OQUSxmSgp8I8Blg_TUgO4vDA';
const CATS = [
  ['dermocosmeticos', 'Dermocosméticos', 'Dermocosméticos originais para cuidar da pele do rosto e do corpo: hidratantes, séruns, limpeza facial e tratamentos.'],
  ['protecao-solar', 'Proteção Solar', 'Protetores solares facial e corporal, com e sem cor, das melhores marcas, para proteção diária contra raios UVA e UVB.'],
  ['maquiagem', 'Maquiagem', 'Maquiagem original: bases, corretivos, batons, máscaras de cílios, paletas e muito mais.'],
  ['cabelos', 'Cuidados Capilares', 'Shampoos, condicionadores, máscaras, óleos e finalizadores para todos os tipos de cabelo.'],
  ['corpo-banho', 'Corpo e Banho', 'Hidratantes corporais, sabonetes, óleos, esfoliantes e desodorantes para o cuidado diário do corpo.'],
  ['infantil', 'Mamãe e Bebê', 'Fraldas, lenços umedecidos, cremes e cuidados para mamães e bebês.'],
];
const POL = {
  'quem-somos': 'Quem somos', 'fale-conosco': 'Fale conosco', pagamento: 'Formas de pagamento', frete: 'Política de frete',
  'trocas-e-devolucoes': 'Trocas e devoluções', reembolso: 'Política de reembolso', privacidade: 'Política de privacidade',
  termos: 'Termos e condições de uso', 'aviso-legal': 'Aviso legal', rastreio: 'Rastrear pedido', marcas: 'Todas as marcas',
};
const NOINDEX = new Set(['checkout', 'conta', 'entrar', 'cadastro', 'favoritos', 'busca', 'nova-senha']);
const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const bslug = (b) => norm(b).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function q(path) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: KEY } });
  if (!r.ok) throw new Error('supabase ' + r.status);
  return r.json();
}
async function all(path) {
  let out = [];
  for (let o = 0; ; o += 1000) {
    const d = await q(`${path}${path.includes('?') ? '&' : '?'}offset=${o}&limit=1000`);
    out = out.concat(d);
    if (d.length < 1000) break;
  }
  return out;
}
const STORE = {
  name: 'Malta Cosméticos', legal: '67.600.045 PRISCILA DE PAULA PEREIRA MALTA', cnpj: '67.600.045/0001-78',
  street: 'Alameda Rui Ferreira, 61, Centro', city: 'Foz do Iguaçu', uf: 'PR', cep: '85851-400',
  phone: '+55-45-99965-8427', email: 'atendimento@maltacosmeticos.online',
};
module.exports = { SB, KEY, CATS, POL, NOINDEX, norm, bslug, esc, q, all, STORE };
