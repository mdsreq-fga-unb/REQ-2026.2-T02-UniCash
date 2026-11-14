



















/* Catálogo de casos de uso do UniCash.
 * Lê consulta/dados/catalogo.json, gerado pelo hook rastreabilidade.py.
 */
(function () {
  "use strict";
 
  var raiz = document.getElementById("catalogo");
  if (!raiz) return;
 
  var ORDEM_TIPOS = ["RF", "RNF", "RN"];
 
  var NOMES_TIPOS = {
    RF: "Requisitos funcionais",
    RNF: "Requisitos não funcionais",
    RN: "Regras de negócio"
  };
 
  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
 
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "texto") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
 
    (filhos || []).forEach(function (f) {
      if (f) n.appendChild(f);
    });
 
    return n;
  }
 
  function normalizar(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
 
  function slug(s) {
    return normalizar(s)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
 
  fetch(raiz.dataset.fonte)
    .then(function (resposta) {
      if (!resposta.ok) {
        throw new Error("Erro ao carregar os dados.");
      }
      return resposta.json();
    })
    .then(montar)
    .catch(function () {
      raiz.textContent =
        "Não foi possível carregar os casos de uso. Consulte o menu lateral.";
    });
 
  var ORDEM_STATUS = [
    "Publicado na main",
    "Implementado na develop",
    "Em desenvolvimento",
    "Planejado",
    "Sem issue",
    "Não informado"
  ];

  function montar(dados) {
    var itens = dados.itens || [];
    var porCodigo = {};

    itens.forEach(function (item) {
      porCodigo[item.codigo] = item;
    });

    var casos = itens
      .filter(function (item) { return item.tipo === "UC"; })
      .sort(function (a, b) {
        return a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
      });

    // Relações «include»/«extend» recebidas (ex.: UC01 é incluído por UC04).
    var recebidas = {};
    casos.forEach(function (caso) {
      (caso.ligacoes_uc || []).forEach(function (l) {
        (recebidas[l.alvo] = recebidas[l.alvo] || []).push({ origem: caso.codigo, tipo: l.tipo });
      });
    });

    function status(caso) {
      return caso.status_implementacao || "Não informado";
    }

    function link(item, texto, classe) {
      return el("a", { href: "../" + item.url, class: classe || "", texto: texto });
    }

    function relacionadosPorTipo(caso, tipo) {
      return (caso.relacoes || [])
        .map(function (codigo) { return porCodigo[codigo]; })
        .filter(function (item) { return item && item.tipo === tipo; });
    }

    function rfsPrincipais(caso) {
      var deps = (caso.dependencias_funcionais || []).filter(function (d) { return d.principal; });
      if (deps.length) return deps;
      return relacionadosPorTipo(caso, "RF").map(function (rf) {
        return { codigo: rf.codigo, nome: rf.nome, url: rf.url, mvp: rf.mvp };
      });
    }

    // ---------------------------------------------------------------- //
    // Panorama: quantos casos de uso em cada situação
    // ---------------------------------------------------------------- //
    var contagemStatus = {};
    casos.forEach(function (c) { contagemStatus[status(c)] = (contagemStatus[status(c)] || 0) + 1; });
    var comCodigo = (contagemStatus["Publicado na main"] || 0) + (contagemStatus["Implementado na develop"] || 0);

    var barra = el("div", { class: "uc-panorama__barra", role: "img",
      "aria-label": comCodigo + " de " + casos.length + " casos de uso com código integrado" });
    var legenda = el("ul", { class: "uc-panorama__legenda" });
    ORDEM_STATUS.forEach(function (st) {
      var n = contagemStatus[st];
      if (!n) return;
      var segmento = el("span", { class: "uc-panorama__segmento catalogo-status-" + slug(st),
        title: st + ": " + n });
      segmento.style.flexGrow = String(n);
      barra.appendChild(segmento);
      legenda.appendChild(el("li", {}, [
        el("span", { class: "catalogo-status catalogo-status-" + slug(st), texto: st }),
        el("strong", { texto: " " + n })
      ]));
    });

    var panorama = el("section", { class: "uc-panorama", "aria-label": "Situação dos casos de uso" }, [
      el("p", { class: "uc-panorama__numero" }, [
        el("strong", { texto: comCodigo + " de " + casos.length }),
        document.createTextNode(" casos de uso com código integrado")
      ]),
      barra,
      legenda,
      el("p", { class: "uc-panorama__nota",
        texto: "Situação calculada a partir das issues e pull requests do GitHub." })
    ]);

    // ---------------------------------------------------------------- //
    // Busca
    // ---------------------------------------------------------------- //
    var busca = el("input", {
      type: "search",
      class: "md-input catalogo-busca",
      placeholder: "Buscar caso de uso ou requisito (ex.: receitas, RF07, RN06)",
      "aria-label": "Buscar casos de uso"
    });
    var contagem = el("p", { class: "catalogo-contagem", "aria-live": "polite" });
    var grade = el("div", { class: "uc-grade" });

    raiz.innerHTML = "";
    raiz.appendChild(panorama);
    raiz.appendChild(el("div", { class: "catalogo-acoes" }, [busca, contagem]));
    raiz.appendChild(grade);

    // ---------------------------------------------------------------- //
    // Card de cada caso de uso
    // ---------------------------------------------------------------- //
    function chipRf(dep) {
      var destino = dep.url || (porCodigo[dep.codigo] || {}).url;
      var classe = "uc-cat__rf" + (dep.mvp ? " uc-cat__rf--mvp" : "");
      var chip = destino
        ? el("a", { href: "../" + destino, class: classe, texto: dep.codigo })
        : el("span", { class: classe, texto: dep.codigo });
      chip.title = (dep.nome || "") + (dep.mvp ? " · No MVP" : " · Fora do MVP");
      return chip;
    }

    // Relações entre casos de uso agrupadas por sentido, em português, com o
    // estereótipo UML («include»/«extend») no título de cada grupo.
    var GRUPOS_RELACAO = [
      { chave: "inclui", rotulo: "Inclui", uml: "«include»" },
      { chave: "estende", rotulo: "Estende", uml: "«extend»" },
      { chave: "incluido", rotulo: "Incluído por", uml: "«include»" },
      { chave: "estendido", rotulo: "Estendido por", uml: "«extend»" }
    ];

    function linhaRelacoes(caso) {
      var grupos = { inclui: [], estende: [], incluido: [], estendido: [] };
      (caso.ligacoes_uc || []).forEach(function (l) {
        grupos[l.tipo === "include" ? "inclui" : "estende"].push(l.alvo);
      });
      (recebidas[caso.codigo] || []).forEach(function (r) {
        grupos[r.tipo === "include" ? "incluido" : "estendido"].push(r.origem);
      });
      var lista = el("span", { class: "uc-cat__relacoes" });
      GRUPOS_RELACAO.forEach(function (g) {
        var codigos = grupos[g.chave];
        if (!codigos.length) return;
        var grupo = el("span", { class: "uc-cat__relacao", title: g.uml }, [el("em", { texto: g.rotulo + " " })]);
        codigos.forEach(function (cod, i) {
          if (i) grupo.appendChild(document.createTextNode(", "));
          var alvo = porCodigo[cod];
          grupo.appendChild(alvo ? link(alvo, cod) : document.createTextNode(cod));
        });
        lista.appendChild(grupo);
      });
      if (!lista.children.length) return null;
      return el("div", { class: "uc-cat__linha" }, [el("span", { class: "uc-cat__rotulo", texto: "Relações" }), lista]);
    }

    function detalhes(caso) {
      var painel = el("details", { class: "uc-cat__detalhes" });
      var total = 0;
      var corpo = el("div", { class: "uc-cat__grupos" });
      ORDEM_TIPOS.forEach(function (tipo) {
        var lista = relacionadosPorTipo(caso, tipo);
        if (!lista.length) return;
        total += lista.length;
        var ul = el("ul");
        lista.forEach(function (item) {
          ul.appendChild(el("li", {}, [link(item, item.codigo, "ref ref-" + tipo.toLowerCase()),
            document.createTextNode(" " + item.nome)]));
        });
        corpo.appendChild(el("section", {}, [el("h4", { texto: NOMES_TIPOS[tipo] + " (" + lista.length + ")" }), ul]));
      });
      if (!total) return null;
      painel.appendChild(el("summary", { texto: "Todos os requisitos ligados (" + total + ")" }));
      painel.appendChild(corpo);
      return painel;
    }

    function card(caso) {
      var st = status(caso);
      var ev = caso.evidencia || {};
      var rfs = rfsPrincipais(caso);
      var cps = [];
      rfs.forEach(function (d) {
        var cp = (porCodigo[d.codigo] || {}).cp;
        if (cp && cps.indexOf(cp) < 0) cps.push(cp);
      });
      var nRnf = relacionadosPorTipo(caso, "RNF").length;
      var nRn = relacionadosPorTipo(caso, "RN").length;

      var evidencia = el("p", { class: "uc-cat__evidencia" }, [document.createTextNode(ev.frase || st)]);
      if (ev.url) {
        evidencia.appendChild(document.createTextNode(" · "));
        evidencia.appendChild(el("a", { href: ev.url, target: "_blank", rel: "noopener", texto: ev.rotulo + " ↗" }));
      }

      var linhaRfs = el("div", { class: "uc-cat__linha" }, [el("span", { class: "uc-cat__rotulo", texto: "RFs" })]);
      var chips = el("span", { class: "uc-cat__rfs" });
      rfs.forEach(function (d) { chips.appendChild(chipRf(d)); });
      if (!rfs.length) chips.textContent = "—";
      linhaRfs.appendChild(chips);

      var rodape = [];
      cps.forEach(function (cp) { if (porCodigo[cp]) rodape.push(link(porCodigo[cp], cp + " · " + porCodigo[cp].nome)); });
      var numeros = [];
      if (nRnf) numeros.push(nRnf + " RNF");
      if (nRn) numeros.push(nRn + " RN");

      return el("article", { class: "uc-cat uc-cat--" + slug(st) }, [
        el("div", { class: "uc-cat__topo" }, [
          link(caso, caso.codigo, "uc-cat__codigo"),
          el("span", { class: "catalogo-status catalogo-status-" + slug(st), texto: st })
        ]),
        el("h3", { class: "uc-cat__nome" }, [link(caso, caso.nome || caso.codigo)]),
        caso.descricao ? el("p", { class: "uc-cat__valor", texto: caso.descricao }) : null,
        evidencia,
        linhaRfs,
        linhaRelacoes(caso),
        (rodape.length || numeros.length)
          ? el("p", { class: "uc-cat__rodape" }, rodape.concat(numeros.length
              ? [document.createTextNode((rodape.length ? " · " : "") + numeros.join(" · "))] : []))
          : null,
        detalhes(caso)
      ]);
    }

    function corresponde(caso, termo) {
      var partes = [caso.codigo, caso.nome, caso.descricao, status(caso)];
      (caso.relacoes || []).forEach(function (codigo) {
        var item = porCodigo[codigo];
        partes.push(codigo);
        if (item) partes.push(item.nome);
      });
      return normalizar(partes.join(" ")).includes(termo);
    }

    function atualizar() {
      var termo = normalizar(busca.value.trim());
      var filtrados = casos.filter(function (caso) { return !termo || corresponde(caso, termo); });
      grade.innerHTML = "";
      contagem.textContent = filtrados.length + " de " + casos.length + " casos de uso";
      filtrados.forEach(function (caso) { grade.appendChild(card(caso)); });
      if (!filtrados.length) {
        grade.appendChild(el("p", { class: "catalogo-vazio", texto: "Nenhum caso de uso encontrado." }));
      }
    }

    busca.addEventListener("input", atualizar);
    atualizar();
  }
})();
