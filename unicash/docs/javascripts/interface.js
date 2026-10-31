/* Recursos de navegação presentes em todas as páginas:
 * - botão flutuante de consulta rápida (Ctrl+K), com busca de CP, UC, RF, RNF e RN;
 * - painel lateral recolhível com o glossário;
 * - alternância entre a navegação por páginas e a leitura contínua;
 * - botão para recolher o menu lateral esquerdo;
 * - leitura em voz alta das atas (voz do navegador). */
(function () {
  "use strict";

  var configuracao = JSON.parse(document.getElementById("__config").textContent);
  var BASE = configuracao.base.replace(/\/?$/, "/");
  var PAGINA_CONTINUA = "print_page/";
  var naLeituraContinua = location.pathname.replace(/\/$/, "").endsWith("/print_page");

  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "texto") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) n.appendChild(f); });
    return n;
  }

  function normalizar(s) {
    return (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function guardar(chave, valor) {
    try { localStorage.setItem("unicash." + chave, valor); } catch (e) { /* armazenamento indisponível */ }
  }

  function ler(chave) {
    try { return localStorage.getItem("unicash." + chave); } catch (e) { return null; }
  }

  var ICONE_BUSCA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.52 6.52 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5Z"/></svg>';

  // ------------------------------------------------------------------ //
  // Consulta rápida (botão flutuante + painel de busca)
  // ------------------------------------------------------------------ //
  var catalogo = null;

  function carregarCatalogo() {
    if (catalogo) return Promise.resolve(catalogo);
    return fetch(BASE + "consulta/dados/catalogo.json").then(function (r) { return r.json(); })
      .then(function (d) {
        d.itens.forEach(function (i) { i._busca = normalizar(i.codigo + " " + i.nome + " " + i.descricao); });
        catalogo = d;
        return d;
      });
  }

  var botao = el("button", {
    type: "button", class: "uc-fab", title: "Consulta rápida (Ctrl+K)", "aria-haspopup": "dialog",
    html: ICONE_BUSCA + "<span>Consulta rápida</span>"
  });
  var busca = el("input", {
    type: "search", class: "uc-busca", placeholder: "Buscar RF, RNF, RN, UC ou CP por código ou palavra…",
    "aria-label": "Buscar requisito", autocomplete: "off"
  });
  var lista = el("ul", { class: "uc-resultados", role: "listbox", "aria-label": "Resultados" });
  var atalhos = el("nav", { class: "uc-atalhos", "aria-label": "Atalhos da consulta rápida",
    html: '<a href="' + BASE + 'consulta/">Catálogo</a>' +
      '<a href="' + BASE + 'consulta/rastreabilidade/">Grafo 3D</a>' +
      '<a href="' + BASE + 'consulta/painel/">Painel</a>' +
      '<a href="' + BASE + 'consulta/etiquetas/">Etiquetas</a>' +
      '<span class="uc-dica"><kbd>↑</kbd><kbd>↓</kbd> navegar · <kbd>Enter</kbd> abrir · <kbd>Esc</kbd> fechar</span>' });
  var dialogo = el("dialog", { class: "uc-dialogo", "aria-label": "Consulta rápida" }, [
    el("div", { class: "uc-dialogo-topo" }, [busca,
      el("button", { type: "button", class: "uc-fechar", "aria-label": "Fechar", texto: "×" })]),
    lista, atalhos
  ]);
  document.body.appendChild(botao);
  document.body.appendChild(dialogo);

  var selecionado = 0;

  function abrirConsulta() {
    if (!dialogo.open) dialogo.showModal();
    busca.focus();
    busca.select();
    carregarCatalogo().then(atualizarResultados);
  }

  function atualizarResultados() {
    var termos = normalizar(busca.value).split(/\s+/).filter(Boolean);
    var itens = catalogo.itens.filter(function (i) {
      return termos.every(function (t) { return i._busca.indexOf(t) >= 0; });
    });
    var exato = normalizar(busca.value.trim());
    itens.sort(function (a, b) {
      return (normalizar(b.codigo) === exato) - (normalizar(a.codigo) === exato);
    });
    lista.innerHTML = "";
    itens.slice(0, 40).forEach(function (i, n) {
      var li = el("li", { role: "option", "aria-selected": n === 0 ? "true" : "false" }, [
        el("a", { href: BASE + i.url }, [
          el("span", { class: "selo selo-" + i.tipo.toLowerCase(), texto: i.codigo }),
          el("span", { class: "uc-res-nome", texto: i.nome }),
          i.tipo === "RF" ? el("span", { class: "selo " + (i.mvp ? "selo-mvp" : "selo-fora"), texto: i.mvp ? "MVP" : "Fora" }) : null
        ])
      ]);
      lista.appendChild(li);
    });
    if (!itens.length) lista.appendChild(el("li", { class: "uc-vazio", texto: "Nenhum item encontrado." }));
    selecionado = 0;
  }

  function mover(delta) {
    var opcoes = lista.querySelectorAll("li[role=option]");
    if (!opcoes.length) return;
    opcoes[selecionado].setAttribute("aria-selected", "false");
    selecionado = (selecionado + delta + opcoes.length) % opcoes.length;
    opcoes[selecionado].setAttribute("aria-selected", "true");
    opcoes[selecionado].scrollIntoView({ block: "nearest" });
  }

  botao.addEventListener("click", abrirConsulta);
  dialogo.querySelector(".uc-fechar").addEventListener("click", function () { dialogo.close(); });
  dialogo.addEventListener("click", function (e) { if (e.target === dialogo) dialogo.close(); });
  busca.addEventListener("input", function () { if (catalogo) atualizarResultados(); });
  busca.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); mover(1); }
    if (e.key === "ArrowUp") { e.preventDefault(); mover(-1); }
    if (e.key === "Enter") {
      var ativo = lista.querySelector("li[aria-selected=true] a");
      if (ativo) location.href = ativo.href;
    }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      abrirConsulta();
    }
  });

  // ------------------------------------------------------------------ //
  // Glossário em painel lateral recolhível
  // ------------------------------------------------------------------ //
  var abaGlossario = el("button", { type: "button", class: "uc-aba-glossario", "aria-expanded": "false",
    "aria-controls": "uc-glossario", texto: "Glossário" });
  var buscaGlossario = el("input", { type: "search", class: "uc-busca", placeholder: "Filtrar siglas…",
    "aria-label": "Filtrar glossário" });
  var listaGlossario = el("dl", { class: "uc-glossario-lista" });
  var painelGlossario = el("aside", { id: "uc-glossario", class: "uc-glossario", "aria-label": "Glossário", hidden: "" }, [
    el("div", { class: "uc-glossario-topo" }, [
      el("strong", { texto: "Glossário" }),
      el("button", { type: "button", class: "uc-fechar", "aria-label": "Fechar glossário", texto: "×" })
    ]),
    buscaGlossario, listaGlossario,
    el("a", { class: "uc-glossario-pagina", href: BASE + "consulta/glossario/", texto: "Abrir a página do glossário" })
  ]);
  document.body.appendChild(abaGlossario);
  document.body.appendChild(painelGlossario);

  var glossario = null;

  function alternarGlossario(abrir) {
    painelGlossario.hidden = !abrir;
    abaGlossario.setAttribute("aria-expanded", abrir ? "true" : "false");
    document.body.classList.toggle("uc-glossario-aberto", abrir);
    if (!abrir) return;
    buscaGlossario.focus();
    if (glossario) return;
    fetch(BASE + "consulta/dados/glossario.json").then(function (r) { return r.json(); }).then(function (d) {
      glossario = d;
      desenharGlossario();
    });
  }

  function desenharGlossario() {
    var termo = normalizar(buscaGlossario.value);
    listaGlossario.innerHTML = "";
    glossario.filter(function (g) { return normalizar(g.sigla + " " + g.significado).indexOf(termo) >= 0; })
      .forEach(function (g) {
        listaGlossario.appendChild(el("dt", { texto: g.sigla }));
        listaGlossario.appendChild(el("dd", { texto: g.significado }));
      });
  }

  abaGlossario.addEventListener("click", function () { alternarGlossario(painelGlossario.hidden); });
  painelGlossario.querySelector(".uc-fechar").addEventListener("click", function () { alternarGlossario(false); });
  buscaGlossario.addEventListener("input", function () { if (glossario) desenharGlossario(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !painelGlossario.hidden) alternarGlossario(false);
  });

  // ------------------------------------------------------------------ //
  // Alternância: navegação por páginas ⇄ leitura contínua
  // ------------------------------------------------------------------ //
  var cabecalho = document.querySelector(".md-header__inner");
  if (cabecalho) {
    if (!naLeituraContinua) {
      try { sessionStorage.setItem("unicash.ultimaPagina", location.pathname + location.hash); } catch (e) { /* */ }
    }
    var voltar = null;
    try { voltar = sessionStorage.getItem("unicash.ultimaPagina"); } catch (e) { /* */ }
    var alternador = el("div", { class: "uc-visao", role: "group", "aria-label": "Forma de leitura" }, [
      el("a", { href: naLeituraContinua ? (voltar || BASE) : location.href,
        "aria-current": naLeituraContinua ? "false" : "true", texto: "Por páginas" }),
      el("a", { href: BASE + PAGINA_CONTINUA, "aria-current": naLeituraContinua ? "true" : "false",
        title: "O projeto inteiro em uma página, pronto para imprimir ou salvar em PDF", texto: "Leitura contínua" })
    ]);
    var busca_ = cabecalho.querySelector(".md-search");
    cabecalho.insertBefore(alternador, busca_ || null);

    if (naLeituraContinua) {
      document.body.classList.add("uc-leitura-continua");
      var imprimir = el("button", { type: "button", class: "md-button md-button--primary uc-imprimir",
        texto: "Imprimir ou salvar em PDF" });
      imprimir.addEventListener("click", function () { window.print(); });
      var conteudo = document.querySelector(".md-content__inner");
      if (conteudo) conteudo.insertBefore(imprimir, conteudo.firstChild);
    }
  }

  // ------------------------------------------------------------------ //
  // Recolher o menu lateral esquerdo (telas largas)
  // ------------------------------------------------------------------ //
  var menu = document.querySelector(".md-sidebar--primary");
  if (menu && !naLeituraContinua) {
    var recolher = el("button", { type: "button", class: "uc-recolher", "aria-controls": "__drawer" });
    function aplicarMenu(oculto) {
      document.body.classList.toggle("uc-sem-menu", oculto);
      recolher.textContent = oculto ? "›" : "‹";
      recolher.title = oculto ? "Mostrar menu lateral" : "Recolher menu lateral";
      recolher.setAttribute("aria-label", recolher.title);
      recolher.setAttribute("aria-expanded", oculto ? "false" : "true");
    }
    aplicarMenu(ler("menuOculto") === "1");
    recolher.addEventListener("click", function () {
      var oculto = !document.body.classList.contains("uc-sem-menu");
      aplicarMenu(oculto);
      guardar("menuOculto", oculto ? "1" : "0");
    });
    document.body.appendChild(recolher);
  }

  // ------------------------------------------------------------------ //
  // Ouvir ata (Web Speech API)
  // ------------------------------------------------------------------ //
  var artigo = document.querySelector(".md-content--post article");
  if (artigo && "speechSynthesis" in window) {
    var fala = window.speechSynthesis;
    var blocos = [], atual = 0, tocando = false;
    var controles = el("div", { class: "uc-ouvir", role: "group", "aria-label": "Ouvir ata" });
    var tocar = el("button", { type: "button", class: "md-button md-button--primary", texto: "▶ Ouvir ata" });
    var parar = el("button", { type: "button", class: "md-button", texto: "■ Parar", disabled: "" });
    var velocidade = el("select", { "aria-label": "Velocidade da leitura", class: "catalogo-select" });
    [["0.9", "0,9×"], ["1", "1×"], ["1.2", "1,2×"], ["1.5", "1,5×"]].forEach(function (v) {
      velocidade.appendChild(el("option", { value: v[0], texto: v[1] }));
    });
    velocidade.value = ler("velocidadeFala") || "1";
    controles.appendChild(tocar);
    controles.appendChild(parar);
    controles.appendChild(velocidade);
    var titulo = artigo.querySelector("h1");
    (titulo || artigo.firstChild).insertAdjacentElement("afterend", controles);

    function voz() {
      var vozes = fala.getVoices().filter(function (v) { return /^pt(-|_)BR/i.test(v.lang); });
      return vozes.find(function (v) { return /natural|google|online/i.test(v.name); }) || vozes[0] || null;
    }

    function textoDe(no) {
      if (no.tagName === "TABLE") {
        var cab = Array.prototype.map.call(no.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
        return Array.prototype.map.call(no.querySelectorAll("tbody tr"), function (tr) {
          return Array.prototype.map.call(tr.cells, function (td, i) {
            return (cab.length > 1 && cab[i] && i > 0 ? cab[i] + ": " : "") + td.textContent.trim();
          }).join(". ");
        }).join(". ");
      }
      return no.textContent.trim();
    }

    function montarBlocos() {
      blocos = [];
      if (titulo) blocos.push({ no: titulo, texto: titulo.textContent.replace("¶", "").trim() });
      artigo.querySelectorAll(".md-typeset > p, .md-typeset > ul > li, .md-typeset > ol > li, .md-typeset > table, .md-typeset .md-typeset__table table, .md-typeset > h2, .md-typeset > h3")
        .forEach(function (no) {
          if (no.closest(".uc-ouvir")) return;
          var t = textoDe(no).replace(/¶/g, "");
          if (t) blocos.push({ no: no.closest(".md-typeset__scrollwrap") || no, texto: t });
        });
    }

    function marcar(i) {
      artigo.querySelectorAll(".uc-lendo").forEach(function (n) { n.classList.remove("uc-lendo"); });
      if (blocos[i]) {
        blocos[i].no.classList.add("uc-lendo");
        blocos[i].no.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }

    function falar(i) {
      if (i >= blocos.length) { encerrar(); return; }
      atual = i;
      marcar(i);
      var u = new SpeechSynthesisUtterance(blocos[i].texto);
      u.lang = "pt-BR";
      u.voice = voz();
      u.rate = parseFloat(velocidade.value);
      u.onend = function () { if (tocando) falar(i + 1); };
      fala.speak(u);
    }

    function encerrar() {
      tocando = false;
      fala.cancel();
      marcar(-1);
      tocar.textContent = "▶ Ouvir ata";
      parar.disabled = true;
    }

    tocar.addEventListener("click", function () {
      if (tocando && !fala.paused) { fala.pause(); tocar.textContent = "▶ Continuar"; return; }
      if (tocando && fala.paused) { fala.resume(); tocar.textContent = "❚❚ Pausar"; return; }
      montarBlocos();
      tocando = true;
      parar.disabled = false;
      tocar.textContent = "❚❚ Pausar";
      fala.cancel();
      falar(0);
    });
    parar.addEventListener("click", encerrar);
    velocidade.addEventListener("change", function () { guardar("velocidadeFala", velocidade.value); });
    window.addEventListener("beforeunload", function () { fala.cancel(); });
  }
})();
