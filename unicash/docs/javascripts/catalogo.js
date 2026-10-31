/* Catálogo filtrável de requisitos (página Consulta rápida).
 * Lê consulta/dados/catalogo.json, gerado pelo hook hooks/rastreabilidade.py. */
(function () {
  "use strict";

  var raiz = document.getElementById("catalogo");
  if (!raiz) return;

  var ORDEM_TIPOS = ["CP", "UC", "RF", "RNF", "RN"];

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

  function lerHash() {
    var p = {};
    location.hash.replace(/^#/, "").split("&").forEach(function (par) {
      var kv = par.split("=");
      if (kv[0]) p[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    });
    return p;
  }

  fetch(raiz.dataset.fonte)
    .then(function (r) { return r.json(); })
    .then(montar)
    .catch(function () {
      raiz.textContent = "Não foi possível carregar o catálogo. Use o menu lateral para consultar os itens.";
    });

  function montar(dados) {
    var itens = dados.itens;
    var porCodigo = {};
    itens.forEach(function (i) {
      porCodigo[i.codigo] = i;
      i._busca = normalizar([i.codigo, i.nome, i.descricao, i.classificacao, i.aplica, i.cp].join(" "));
    });

    var estado = Object.assign({ q: "", tipo: "", cp: "", classe: "", mvp: "" }, lerHash());

    // ---- Controles ----
    var busca = el("input", {
      type: "search", class: "md-input catalogo-busca",
      placeholder: "Buscar por código, nome ou descrição (ex.: saldo, offline, RF37)",
      "aria-label": "Buscar no catálogo"
    });
    busca.value = estado.q;

    var chips = el("div", { class: "catalogo-chips", role: "group", "aria-label": "Filtrar por tipo" });
    [""].concat(ORDEM_TIPOS).forEach(function (t) {
      var qtd = t ? itens.filter(function (i) { return i.tipo === t; }).length : itens.length;
      var b = el("button", { type: "button", class: "chip chip-" + (t || "todos").toLowerCase(), "data-tipo": t,
        texto: (t ? dados.plurais[t] : "Todos") + " (" + qtd + ")" });
      chips.appendChild(b);
    });

    function select(rotulo, chave, opcoes) {
      var s = el("select", { class: "catalogo-select", "aria-label": rotulo });
      s.appendChild(el("option", { value: "", texto: rotulo }));
      opcoes.forEach(function (o) { s.appendChild(el("option", { value: o[0], texto: o[1] })); });
      s.value = estado[chave];
      s.addEventListener("change", function () { estado[chave] = s.value; atualizar(); });
      return s;
    }

    var cps = itens.filter(function (i) { return i.tipo === "CP"; })
      .map(function (i) { return [i.codigo, i.codigo + " — " + i.nome]; });
    var classes = Array.from(new Set(itens.filter(function (i) { return i.tipo === "RNF"; })
      .map(function (i) { return i.classificacao; }))).sort().map(function (c) { return [c, c]; });

    var filtros = el("div", { class: "catalogo-filtros" }, [
      select("Todas as características", "cp", cps),
      select("Todas as classificações de RNF", "classe", classes),
      select("MVP: todos", "mvp", [["sim", "Somente no MVP"], ["nao", "Somente fora do MVP"]])
    ]);
    var limpar = el("button", { type: "button", class: "md-button catalogo-limpar", texto: "Limpar filtros" });
    var contagem = el("p", { class: "catalogo-contagem", "aria-live": "polite" });
    var exportar = el("button", { type: "button", class: "md-button catalogo-exportar", texto: "Exportar CSV" });

    var tabela = el("table", { class: "catalogo-tabela" });
    tabela.innerHTML = "<thead><tr><th>Código</th><th>Nome</th><th>Tipo</th><th>Agrupamento</th>" +
      "<th title='Itens relacionados'>Relações</th><th>MVP</th></tr></thead>";
    var corpo = el("tbody");
    tabela.appendChild(corpo);

    raiz.innerHTML = "";
    raiz.appendChild(busca);
    raiz.appendChild(chips);
    raiz.appendChild(filtros);
    raiz.appendChild(el("div", { class: "catalogo-acoes" }, [contagem, limpar, exportar]));
    raiz.appendChild(el("div", { class: "catalogo-rolagem" }, [tabela]));

    // ---- Eventos ----
    busca.addEventListener("input", function () { estado.q = busca.value; atualizar(); });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      estado.tipo = b.dataset.tipo;
      atualizar();
    });
    limpar.addEventListener("click", function () {
      estado = { q: "", tipo: "", cp: "", classe: "", mvp: "" };
      busca.value = "";
      filtros.querySelectorAll("select").forEach(function (s) { s.value = ""; });
      atualizar();
    });
    exportar.addEventListener("click", function () { baixarCSV(filtrar()); });
    document.addEventListener("keydown", function (e) {
      var alvo = e.target.tagName;
      if (e.key === "/" && alvo !== "INPUT" && alvo !== "TEXTAREA" && alvo !== "SELECT") {
        e.preventDefault();
        busca.focus();
      }
    });

    var base = raiz.dataset.fonte.replace(/dados\/catalogo\.json$/, "../");

    function filtrar() {
      var termos = normalizar(estado.q).split(/\s+/).filter(Boolean);
      return itens.filter(function (i) {
        if (estado.tipo && i.tipo !== estado.tipo) return false;
        if (estado.cp && i.cp !== estado.cp && i.codigo !== estado.cp &&
            (i.relacoes || []).indexOf(estado.cp) < 0) return false;
        if (estado.classe && i.classificacao !== estado.classe) return false;
        if (estado.mvp && (i.tipo !== "RF" || (estado.mvp === "sim") !== !!i.mvp)) return false;
        return termos.every(function (t) { return i._busca.indexOf(t) >= 0; });
      });
    }

    function agrupamento(i) {
      if (i.tipo === "RF") return i.cp + " — " + (porCodigo[i.cp] ? porCodigo[i.cp].nome : "");
      if (i.tipo === "RNF") return i.classificacao;
      return "";
    }

    function atualizar() {
      chips.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.tipo === estado.tipo ? "true" : "false");
      });
      var hash = Object.keys(estado).filter(function (k) { return estado[k]; })
        .map(function (k) { return k + "=" + encodeURIComponent(estado[k]); }).join("&");
      history.replaceState(null, "", hash ? "#" + hash : location.pathname + location.search);

      var lista = filtrar();
      contagem.textContent = lista.length + " de " + itens.length + " itens";
      corpo.innerHTML = "";
      lista.forEach(function (i) {
        var linha = el("tr", { class: "linha-" + i.tipo.toLowerCase() });
        var link = el("a", { href: base + i.url, class: "ref ref-" + i.tipo.toLowerCase(), texto: i.codigo });
        var detalhe = el("details", {}, [
          el("summary", { texto: i.nome }),
          el("p", { texto: i.descricao || "Sem descrição." }),
          i.aplica ? el("p", { html: "<strong>Aplica-se a:</strong> " }) : null
        ]);
        if (i.aplica) detalhe.lastChild.appendChild(document.createTextNode(i.aplica));
        var mvp = i.tipo === "RF"
          ? el("span", { class: "selo " + (i.mvp ? "selo-mvp" : "selo-fora"), texto: i.mvp ? "Sim" : "Não" })
          : el("span", { texto: "—" });
        [el("td", {}, [link]), el("td", {}, [detalhe]), el("td", { texto: i.tipo }),
          el("td", { texto: agrupamento(i) }), el("td", { texto: String((i.relacoes || []).length) }),
          el("td", {}, [mvp])].forEach(function (c) { linha.appendChild(c); });
        corpo.appendChild(linha);
      });
      if (!lista.length) {
        corpo.appendChild(el("tr", {}, [el("td", { colspan: "6", texto: "Nenhum item encontrado com esses filtros." })]));
      }
    }

    function baixarCSV(lista) {
      var cab = ["codigo", "tipo", "nome", "descricao", "agrupamento", "mvp", "relacoes"];
      var linhas = [cab.join(";")].concat(lista.map(function (i) {
        return [i.codigo, i.tipo, i.nome, i.descricao, agrupamento(i),
          i.tipo === "RF" ? (i.mvp ? "sim" : "nao") : "", (i.relacoes || []).join(" ")]
          .map(function (v) { return '"' + String(v || "").replace(/"/g, '""') + '"'; }).join(";");
      }));
      var blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
      var a = el("a", { href: URL.createObjectURL(blob), download: "unicash-requisitos.csv" });
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    atualizar();
  }
})();
