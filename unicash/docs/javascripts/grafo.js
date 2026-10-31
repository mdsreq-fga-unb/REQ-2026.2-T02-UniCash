/* Grafo de rastreabilidade em 3D (three.js via 3d-force-graph) e 2D (force-graph).
 * Lê consulta/dados/catalogo.json, gerado pelo hook hooks/rastreabilidade.py. */
(function () {
  "use strict";

  var raiz = document.getElementById("grafo");
  if (!raiz) return;

  var CORES = { CP: "#7c3aed", UC: "#0891b2", RF: "#2563eb", RNF: "#ea580c", RN: "#16a34a" };
  var TAMANHO = { CP: 9, UC: 7, RF: 4, RNF: 4, RN: 4 };

  var area = raiz.querySelector(".grafo-area");
  var detalhe = raiz.querySelector(".grafo-detalhe");
  var busca = raiz.querySelector(".grafo-busca");
  var tiposEl = raiz.querySelector(".grafo-tipos");
  var soMvp = raiz.querySelector(".grafo-mvp");
  var botaoModo = raiz.querySelector(".grafo-modo");
  var base = raiz.dataset.fonte.replace(/dados\/catalogo\.json$/, "../");

  var dados, porCodigo = {}, ativos = { CP: true, UC: true, RF: true, RNF: true, RN: true };
  var grafo, modo3d = !matchMedia("(max-width: 720px)").matches, selecionado = null, vizinhos = new Set();

  fetch(raiz.dataset.fonte).then(function (r) { return r.json(); }).then(function (d) {
    dados = d;
    d.itens.forEach(function (i) { porCodigo[i.codigo] = i; });
    Object.keys(CORES).forEach(function (t) {
      var l = document.createElement("label");
      l.className = "grafo-opcao";
      l.innerHTML = '<input type="checkbox" checked> <span class="grafo-cor" style="background:' +
        CORES[t] + '"></span> ' + d.plurais[t];
      l.querySelector("input").addEventListener("change", function (e) { ativos[t] = e.target.checked; desenhar(); });
      tiposEl.appendChild(l);
    });
    desenhar();
  }).catch(function () {
    area.textContent = "Não foi possível carregar o grafo.";
  });

  function montarDados() {
    var nos = dados.itens.filter(function (i) {
      if (!ativos[i.tipo]) return false;
      if (soMvp.checked && i.tipo === "RF" && !i.mvp) return false;
      return true;
    }).map(function (i) { return { id: i.codigo, tipo: i.tipo, nome: i.nome, item: i }; });
    var ids = new Set(nos.map(function (n) { return n.id; }));
    var links = [], vistos = new Set();
    nos.forEach(function (n) {
      (n.item.relacoes || []).forEach(function (r) {
        var chave = [n.id, r].sort().join("|");
        if (ids.has(r) && !vistos.has(chave)) {
          vistos.add(chave);
          links.push({ source: n.id, target: r });
        }
      });
    });
    return { nodes: nos, links: links };
  }

  function rotulo(n) {
    return "<strong>" + n.id + "</strong> — " + n.nome;
  }

  function corNo(n) {
    if (selecionado && n.id !== selecionado && !vizinhos.has(n.id)) return "rgba(148,163,184,0.35)";
    return CORES[n.tipo];
  }

  function corLink(l) {
    if (!selecionado) return "rgba(148,163,184,0.45)";
    var s = l.source.id || l.source, t = l.target.id || l.target;
    return s === selecionado || t === selecionado ? "#f59e0b" : "rgba(148,163,184,0.12)";
  }

  function desenhar() {
    area.innerHTML = "";
    var largura = area.clientWidth || 800;
    var altura = Math.max(420, Math.min(680, window.innerHeight * 0.7));
    var escuro = document.body.getAttribute("data-md-color-scheme") === "slate";
    var fabrica = modo3d && window.ForceGraph3D ? window.ForceGraph3D : window.ForceGraph;
    if (!fabrica) {
      area.textContent = "Não foi possível carregar a biblioteca do grafo.";
      return;
    }
    botaoModo.textContent = fabrica === window.ForceGraph3D ? "Mudar para 2D" : "Mudar para 3D";

    var ultimoClique = 0;
    grafo = fabrica()(area)
      .width(largura).height(altura)
      .backgroundColor(escuro ? "#1e2129" : "#f8fafc")
      .graphData(montarDados())
      .nodeRelSize(fabrica === window.ForceGraph3D ? 3 : 4)
      .nodeLabel(rotulo)
      .nodeVal(function (n) { return TAMANHO[n.tipo]; })
      .nodeColor(corNo)
      .linkColor(corLink)
      .linkWidth(function (l) { return selecionado && corLink(l) === "#f59e0b" ? 2 : 0.6; })
      .onNodeClick(function (n) {
        var agora = Date.now();
        if (agora - ultimoClique < 400 && selecionado === n.id) {
          location.href = base + n.item.url;
          return;
        }
        ultimoClique = agora;
        selecionar(n.id);
      })
      .onBackgroundClick(function () { selecionar(null); })
      .cooldownTicks(120);

    var ajustado = false;
    grafo.onEngineStop(function () {
      if (!ajustado) { ajustado = true; grafo.zoomToFit(600, 30); }
    });

    if (fabrica === window.ForceGraph) {
      grafo.nodeCanvasObjectMode(function () { return "after"; })
        .nodeCanvasObject(function (n, ctx, escala) {
          if (escala < 1.4 && n.tipo !== "CP" && n.tipo !== "UC") return;
          ctx.font = (10 / escala) + "px sans-serif";
          ctx.fillStyle = escuro ? "#e2e8f0" : "#0f172a";
          ctx.textAlign = "center";
          ctx.fillText(n.id, n.x, n.y + 8 / escala + 4);
        });
    }
  }

  function selecionar(cod) {
    selecionado = cod;
    vizinhos = new Set(cod && porCodigo[cod] ? porCodigo[cod].relacoes : []);
    grafo.nodeColor(grafo.nodeColor()).linkColor(grafo.linkColor()).linkWidth(grafo.linkWidth());
    if (!cod) {
      detalhe.textContent = "Clique em um nó para ver os detalhes.";
      return;
    }
    var i = porCodigo[cod];
    var rel = (i.relacoes || []).map(function (r) {
      return '<a class="ref" href="' + base + porCodigo[r].url + '" title="' + porCodigo[r].nome.replace(/"/g, "&quot;") + '">' + r + "</a>";
    }).join(", ");
    detalhe.innerHTML = '<p><span class="selo" style="background:' + CORES[i.tipo] + ';color:#fff">' +
      dados.tipos[i.tipo] + "</span></p><h3></h3><p class='grafo-desc'></p>" +
      "<p><strong>Relações (" + (i.relacoes || []).length + "):</strong> " + (rel || "nenhuma") + "</p>" +
      '<p><a class="md-button" href="' + base + i.url + '">Abrir página do item</a></p>';
    detalhe.querySelector("h3").textContent = i.codigo + " — " + i.nome;
    detalhe.querySelector(".grafo-desc").textContent = i.descricao || "";

    var no = grafo.graphData().nodes.find(function (n) { return n.id === cod; });
    if (no && no.x !== undefined) {
      if (grafo.cameraPosition) {
        var d = 260, r = 1 + d / Math.hypot(no.x || 1, no.y || 1, no.z || 1);
        grafo.cameraPosition({ x: no.x * r, y: no.y * r, z: no.z * r }, no, 1200);
      } else {
        grafo.centerAt(no.x, no.y, 800);
        grafo.zoom(3, 800);
      }
    }
  }

  busca.addEventListener("change", function () {
    var cod = busca.value.trim().toUpperCase();
    if (porCodigo[cod]) selecionar(cod);
  });
  soMvp.addEventListener("change", desenhar);
  botaoModo.addEventListener("click", function () { modo3d = !modo3d; selecionado = null; desenhar(); });
  window.addEventListener("resize", function () {
    if (grafo) grafo.width(area.clientWidth);
  });
})();
