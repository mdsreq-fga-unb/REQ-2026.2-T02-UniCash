/* Recursos de navegação presentes em todas as páginas:
 * - botão flutuante de consulta rápida (Ctrl+K), com busca de CP, UC, RF, RNF e RN;
 * - aba de pesquisa na borda direita, que abre o mesmo painel de busca;
 * - alternância entre a navegação por páginas e a leitura contínua;
 * - botão para recolher o menu lateral esquerdo. */
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
  // Aba "Pesquisa" na borda direita: outro acesso ao mesmo painel
  // ------------------------------------------------------------------ //
  var abaPesquisa = el("button", { type: "button", class: "uc-aba-lateral", "aria-haspopup": "dialog",
    title: "Pesquisa rápida (Ctrl+K)", texto: "Pesquisa" });
  abaPesquisa.addEventListener("click", abrirConsulta);
  document.body.appendChild(abaPesquisa);

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
  // Áudio do resumo das atas: o caminho é montado a partir da raiz do site
  // para funcionar tanto no post quanto no índice do blog (excerto).
  // ------------------------------------------------------------------ //
  document.querySelectorAll("audio.uc-audio[data-ata]").forEach(function (a) {
    a.src = BASE + "atas/audio/" + a.dataset.ata + ".mp3";
  });
})();
