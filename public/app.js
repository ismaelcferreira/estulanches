'use strict';

const $ = (id) => document.getElementById(id);
const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Máquina de estados (espelha src/logic.js; o servidor é quem valida de fato).
const STATUS = {
  PENDENTE:   { rotulo: 'Pendente',   acoes: ['EM_PREPARO', 'CANCELADO'] },
  EM_PREPARO: { rotulo: 'Em preparo', acoes: ['PRONTO', 'CANCELADO'] },
  PRONTO:     { rotulo: 'Pronto',     acoes: ['ENTREGUE'] },
  ENTREGUE:   { rotulo: 'Entregue',   acoes: [] },
  CANCELADO:  { rotulo: 'Cancelado',  acoes: [] },
};
const ACAO = { EM_PREPARO: 'Iniciar preparo', PRONTO: 'Marcar como pronto', ENTREGUE: 'Entregar', CANCELADO: 'Cancelar' };
const ABAS = ['pedido', 'cozinha', 'cardapio'];
const info = (s) => STATUS[s] || { rotulo: s, acoes: [] };

let cardapio = [];
let pedidos = [];
let abaAtual = 'pedido';
const carrinho = new Map(); // item_id -> quantidade

// Cria elementos sem innerHTML (texto sempre via nós de texto => sem XSS).
function h(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...filhos.flat().filter((f) => f != null && f !== false));
  return e;
}

function toast(texto, tipo = 'ok') {
  const t = h('div', { class: `toast ${tipo}`, role: tipo === 'erro' ? 'alert' : 'status' }, texto);
  t.addEventListener('click', () => t.remove());
  $('toasts').append(t);
  setTimeout(() => t.remove(), tipo === 'erro' ? 6000 : 3500);
}

async function api(metodo, caminho, corpo) {
  let res;
  try {
    res = await fetch(caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error('Sem conexão com o servidor.');
  }
  const dados = await res.json().catch(() => null);
  if (!res.ok) throw new Error((dados && dados.erros && dados.erros.join('; ')) || `Erro inesperado (HTTP ${res.status}).`);
  return dados;
}

/* ---------- Saúde ---------- */
function marcarSaude(estado, texto) {
  $('saude').className = `saude ${estado}`;
  $('saudeTxt').textContent = texto;
  $('saude').title = `Última verificação: ${new Date().toLocaleTimeString('pt-BR')}`;
}

async function checarSaude() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch('/health', { signal: ctrl.signal, cache: 'no-store' });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.status === 'ok') marcarSaude('ok', `Sistema online · v${d.versao}`);
    else marcarSaude('erro', 'Banco de dados indisponível');
  } catch {
    marcarSaude('erro', 'Sem conexão com o servidor');
  } finally {
    clearTimeout(t);
  }
}

/* ---------- Aba 1: Fazer pedido ---------- */
async function carregarCardapio() {
  cardapio = await api('GET', '/cardapio');
  for (const id of [...carrinho.keys()]) {
    const i = cardapio.find((x) => x.id === id);
    if (!i || !i.disponivel) carrinho.delete(id);
  }
  renderCardapio();
  renderCarrinho();
}

function renderCardapio() {
  $('grid').replaceChildren(...(cardapio.length
    ? cardapio.map((i) => h('article', { class: 'item' + (i.disponivel ? '' : ' off') },
        h('h3', {}, i.nome),
        h('p', { class: 'preco' }, brl(i.preco)),
        h('button', { class: 'btn', type: 'button', disabled: !i.disponivel, onclick: () => alterarQtd(i.id, 1) },
          i.disponivel ? '+ Adicionar' : 'Indisponível')))
    : [h('p', { class: 'mut' }, 'Nenhum item no cardápio.')]));

  $('listaCardapio').replaceChildren(...cardapio.map((i) => h('li', {},
    h('span', {}, i.nome, i.disponivel ? '' : ' (indisponível)'),
    h('strong', {}, brl(i.preco)))));
}

function alterarQtd(id, delta) {
  const n = (carrinho.get(id) || 0) + delta;
  if (n > 0) carrinho.set(id, n); else carrinho.delete(id);
  renderCarrinho();
}

function renderCarrinho() {
  let centavos = 0;
  const linhas = [];
  carrinho.forEach((qtd, id) => {
    const item = cardapio.find((i) => i.id === id);
    if (!item) return;
    centavos += Math.round(item.preco * 100) * qtd;
    linhas.push(h('li', {},
      h('div', { class: 'c-info' }, h('strong', {}, item.nome), h('span', { class: 'mut' }, `${brl(item.preco)} cada`)),
      h('div', { class: 'qtd' },
        h('button', { class: 'btn-qtd', type: 'button', 'aria-label': `Remover uma unidade de ${item.nome}`, onclick: () => alterarQtd(id, -1) }, '−'),
        h('span', {}, String(qtd)),
        h('button', { class: 'btn-qtd', type: 'button', 'aria-label': `Adicionar uma unidade de ${item.nome}`, onclick: () => alterarQtd(id, 1) }, '+'))));
  });
  $('carrinho').replaceChildren(...(linhas.length ? linhas : [h('li', { class: 'vazio' }, 'Seu carrinho está vazio.')]));
  $('total').textContent = brl(centavos / 100);
  $('btnPedido').disabled = linhas.length === 0;
}

async function enviarPedido() {
  const cliente = $('cliente').value.trim();
  if (!cliente) return toast('Informe o nome do cliente.', 'erro');
  const itens = [...carrinho].map(([item_id, quantidade]) => ({ item_id, quantidade }));
  $('btnPedido').disabled = true;
  try {
    const p = await api('POST', '/pedidos', { cliente, itens });
    toast(`Pedido #${p.id} enviado para a cozinha — ${brl(p.total)}`);
    carrinho.clear();
    $('cliente').value = '';
    carregarPedidos().catch(() => {});
  } catch (e) {
    toast(e.message, 'erro');
  } finally {
    renderCarrinho();
  }
}

/* ---------- Aba 2: Fila da cozinha ---------- */
async function carregarPedidos() {
  pedidos = await api('GET', '/pedidos');
  renderFila();
}

function quando(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function renderFila() {
  const aberto = (p) => info(p.status).acoes.length > 0;
  const qtdAbertos = pedidos.filter(aberto).length;
  $('contFila').textContent = qtdAbertos;
  $('contFila').hidden = qtdAbertos === 0;

  const ordenados = [...pedidos].sort((a, b) => Number(aberto(b)) - Number(aberto(a))); // abertos primeiro
  $('fila').replaceChildren(...(ordenados.length ? ordenados.map((p) => {
    const st = info(p.status);
    const card = h('article', { class: `pedido ${p.status}` });
    card.append(
      h('div', { class: 'p-topo' }, h('strong', {}, `#${p.id} · ${p.cliente}`), h('span', { class: `badge ${p.status}` }, st.rotulo)),
      h('p', { class: 'mut' }, `${quando(p.criado_em)} · ${brl(p.total)}`),
      h('div', { class: 'acoes' }, ...(st.acoes.length
        ? st.acoes.map((novo) => h('button', {
            class: novo === 'CANCELADO' ? 'btn btn-perigo' : 'btn', type: 'button',
            onclick: () => mudarStatus(p.id, novo, card),
          }, ACAO[novo]))
        : [h('span', { class: 'mut' }, 'Sem ações disponíveis')])));
    return card;
  }) : [h('p', { class: 'vazio-geral' }, 'Nenhum pedido ainda.')]));
}

async function mudarStatus(id, status, card) {
  card.querySelectorAll('button').forEach((b) => (b.disabled = true));
  try {
    const r = await api('PATCH', `/pedidos/${id}/status`, { status });
    toast(`Pedido #${r.id} agora está: ${info(r.status).rotulo}.`);
  } catch (e) {
    toast(e.message, 'erro');
  }
  carregarPedidos().catch(() => {});
}

/* ---------- Aba 3: Gerenciar cardápio ---------- */
async function cadastrarItem(ev) {
  ev.preventDefault();
  const nome = $('novoNome').value.trim();
  const preco = Math.round(Number($('novoPreco').value) * 100) / 100;
  if (!nome) return toast('Informe o nome do item.', 'erro');
  if (!(preco > 0)) return toast('Informe um preço maior que zero.', 'erro');
  try {
    const criado = await api('POST', '/cardapio', { nome, preco });
    toast(`"${criado.nome}" cadastrado por ${brl(criado.preco)}.`);
    $('formItem').reset();
    await carregarCardapio();
  } catch (e) {
    toast(e.message, 'erro');
  }
}

/* ---------- Abas ---------- */
async function ativarAba(nome) {
  abaAtual = nome;
  for (const a of ABAS) {
    const on = a === nome;
    $('aba-' + a).hidden = !on;
    const t = $('tab-' + a);
    t.classList.toggle('ativa', on);
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  }
  try {
    if (nome === 'cozinha') await carregarPedidos(); else await carregarCardapio();
  } catch (e) {
    toast(e.message, 'erro');
  }
}

ABAS.forEach((a, idx) => {
  const t = $('tab-' + a);
  t.addEventListener('click', () => ativarAba(a));
  t.addEventListener('keydown', (ev) => {
    const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const prox = ABAS[(idx + d + ABAS.length) % ABAS.length];
    ativarAba(prox);
    $('tab-' + prox).focus();
  });
});

$('btnPedido').addEventListener('click', enviarPedido);
$('btnLimpar').addEventListener('click', () => { carrinho.clear(); renderCarrinho(); });
$('btnAtualizar').addEventListener('click', () => carregarPedidos().then(() => toast('Fila atualizada.')).catch((e) => toast(e.message, 'erro')));
$('formItem').addEventListener('submit', cadastrarItem);

/* ---------- Inicialização e atualização automática (15 s) ---------- */
renderCarrinho();
checarSaude();
Promise.all([carregarCardapio(), carregarPedidos()]).catch((e) => toast(e.message, 'erro'));
setInterval(checarSaude, 15000);
setInterval(() => { if (abaAtual === 'cozinha') carregarPedidos().catch(() => {}); }, 15000);
