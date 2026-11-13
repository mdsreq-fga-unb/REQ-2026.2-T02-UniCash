



















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
 
  function montar(dados) {
    var itens = dados.itens || [];
    var porCodigo = {};
 
    itens.forEach(function (item) {
      porCodigo[item.codigo] = item;
    });
 
    var casos = itens
      .filter(function (item) {
        return item.tipo === "UC";
      })
      .sort(function (a, b) {
        return a.codigo.localeCompare(b.codigo, undefined, {
          numeric: true
        });
      });
 
    var busca = el("input", {
      type: "search",
      class: "md-input catalogo-busca",
      placeholder: "Buscar caso de uso ou requisito relacionado...",
      "aria-label": "Buscar casos de uso"
    });
 
    var contagem = el("p", {
      class: "catalogo-contagem",
      "aria-live": "polite"
    });
 
    var limpar = el("button", {
      type: "button",
      class: "md-button catalogo-limpar",
      texto: "Limpar busca"
    });
 
    var tabela = el("table", {
      class: "catalogo-tabela"
    });
 
    var cabecalho = el("thead");
    var linhaCabecalho = el("tr");
 
    [
      "Caso de uso",
      "Nome",
      "Descrição",
      "Status de implementação",
      "Dependências funcionais"
    ].forEach(function (titulo) {
      linhaCabecalho.appendChild(
        el("th", { texto: titulo, scope: "col" })
      );
    });
 
    cabecalho.appendChild(linhaCabecalho);
 
    var corpo = el("tbody");
    tabela.appendChild(cabecalho);
    tabela.appendChild(corpo);
 
    raiz.innerHTML = "";
    raiz.appendChild(busca);
    raiz.appendChild(
      el("div", { class: "catalogo-acoes" }, [contagem, limpar])
    );
    raiz.appendChild(
      el("div", { class: "catalogo-tabela-container" }, [tabela])
    );
 
    function criarLink(item, somenteCodigo) {
      return el("a", {
        href: "../" + item.url,
        class: "ref ref-" + item.tipo.toLowerCase(),
        texto: somenteCodigo
          ? item.codigo
          : item.codigo + " — " + item.nome
      });
    }
 
    function relacionadosPorTipo(caso, tipo) {
      return (caso.relacoes || [])
        .map(function (codigo) {
          return porCodigo[codigo];
        })
        .filter(function (item) {
          return item && item.tipo === tipo;
        });
    }
 
    /* Dependências funcionais do caso de uso: RFs principais (do cabeçalho do
     * UC) em destaque e RFs relacionados em tom mais discreto. Se o JSON não
     * trouxer o campo novo, cai de volta para os RFs ligados ao UC. */
    
function dependenciasFuncionais(caso) {
  // Primeiro, utiliza as dependências específicas geradas pelo Python.
  if (
    Array.isArray(caso.dependencias_funcionais) &&
    caso.dependencias_funcionais.length > 0
  ) {
    return caso.dependencias_funcionais;
  }

  // Se estiver vazio, busca os RFs nas relações já cadastradas.
  return relacionadosPorTipo(caso, "RF").map(function (rf) {
    return {
      codigo: rf.codigo,
      nome: rf.nome,
      url: rf.url,
      mvp: rf.mvp,
      principal: true
    };
  });
}

 
    function criarChipDependencia(dep) {
      var item = porCodigo[dep.codigo];
      var nome = dep.nome || (item && item.nome) || "";
      var destino = dep.url || (item && item.url);
      var classe =
        "catalogo-dep " +
        (dep.principal ? "catalogo-dep-principal" : "catalogo-dep-relacionado");
 
      var chip = destino
        ? el("a", {
            href: "../" + destino,
            class: "ref ref-rf " + classe,
            texto: dep.codigo
          })
        : el("span", { class: classe, texto: dep.codigo });
 
      var dica = nome
        ? nome +
          (dep.principal ? " (principal)" : " (relacionado)") +
          (dep.mvp ? " · No MVP" : "")
        : dep.principal
        ? "Requisito principal"
        : "Requisito relacionado";
      chip.setAttribute("title", dica);
 
      return el("li", {}, [chip]);
    }
 
    function criarCelulaDependencias(caso) {
      var celula = el("td", { class: "catalogo-col-deps" });
      var deps = dependenciasFuncionais(caso);
 
      if (!deps.length) {
        celula.textContent = "—";
        return celula;
      }
 
      var lista = el("ul", { class: "catalogo-deps" });
      deps.forEach(function (dep) {
        lista.appendChild(criarChipDependencia(dep));
      });
      celula.appendChild(lista);
      return celula;
    }
 
    function criarCelulaStatus(caso) {
      var texto = caso.status_implementacao || "Não informado";
      var celula = el("td", { class: "catalogo-col-status" });
      celula.appendChild(
        el("span", {
          class: "catalogo-status catalogo-status-" + slug(texto),
          texto: texto
        })
      );
      return celula;
    }
 
    function criarDetalhes(caso) {
      var painel = el("div", {
        class: "catalogo-detalhes"
      });
 
      ORDEM_TIPOS.forEach(function (tipo) {
        var relacionados = relacionadosPorTipo(caso, tipo);
        if (!relacionados.length) return;
 
        var grupo = el("section", {
          class: "catalogo-grupo"
        });
 
        grupo.appendChild(
          el("h4", {
            class: "catalogo-grupo-titulo",
            texto: NOMES_TIPOS[tipo] + " (" + relacionados.length + ")"
          })
        );
 
        var lista = el("ul", {
          class: "catalogo-relacionados"
        });
 
        relacionados.forEach(function (item) {
          var linha = el("li", {
            class: "catalogo-relacionado"
          });
 
          linha.appendChild(criarLink(item, false));
 
          if (tipo === "RF") {
            linha.appendChild(
              el("span", {
                class: "selo " +
                  (item.mvp ? "selo-mvp" : "selo-fora"),
                texto: item.mvp ? "No MVP" : "Fora do MVP"
              })
            );
          }
 
          lista.appendChild(linha);
        });
 
        grupo.appendChild(lista);
        painel.appendChild(grupo);
      });
 
      if (!painel.children.length) {
        painel.appendChild(
          el("p", {
            class: "catalogo-vazio",
            texto: "Nenhuma relação cadastrada para este caso de uso."
          })
        );
      }
 
      return painel;
    }
 
    function corresponde(caso, termo) {
      var partes = [
        caso.codigo,
        caso.nome,
        caso.descricao,
        caso.status_implementacao
      ];
 
      dependenciasFuncionais(caso).forEach(function (dep) {
        partes.push(dep.codigo, dep.nome);
      });
 
      (caso.relacoes || []).forEach(function (codigo) {
        var item = porCodigo[codigo];
 
        if (item) {
          partes.push(item.codigo, item.nome, item.descricao);
        } else {
          partes.push(codigo);
        }
      });
 
      return normalizar(partes.join(" ")).includes(termo);
    }
 
    function atualizar() {
      var termo = normalizar(busca.value.trim());
 
      var filtrados = casos.filter(function (caso) {
        return !termo || corresponde(caso, termo);
      });
 
      corpo.innerHTML = "";
 
      contagem.textContent =
        filtrados.length + " de " + casos.length + " casos de uso";
 
      filtrados.forEach(function (caso) {
        var linha = el("tr", {
          class: "catalogo-linha"
        });
 
        var celulaCodigo = el("td");
        var expansor = el("button", {
          type: "button",
          class: "catalogo-expansor",
          "aria-expanded": "false",
          texto: "+ " + caso.codigo
        });
 
        celulaCodigo.appendChild(expansor);
 
        linha.appendChild(celulaCodigo);
        linha.appendChild(
          el("td", { texto: caso.nome || "—" })
        );
        linha.appendChild(
          el("td", { texto: caso.descricao || "—" })
        );
        linha.appendChild(criarCelulaStatus(caso));
        linha.appendChild(criarCelulaDependencias(caso));
 
        var linhaDetalhes = el("tr", {
          class: "catalogo-linha-detalhes"
        });
 
        var celulaDetalhes = el("td", {
          colspan: "5"
        });
 
        celulaDetalhes.appendChild(criarDetalhes(caso));
        linhaDetalhes.appendChild(celulaDetalhes);
        linhaDetalhes.hidden = true;
 
        expansor.addEventListener("click", function () {
          var aberto = !linhaDetalhes.hidden;
          linhaDetalhes.hidden = aberto;
          expansor.setAttribute("aria-expanded", String(!aberto));
          expansor.textContent = (aberto ? "+ " : "− ") + caso.codigo;
        });
 
        corpo.appendChild(linha);
        corpo.appendChild(linhaDetalhes);
      });
 
      if (!filtrados.length) {
        var linhaVazia = el("tr");
        linhaVazia.appendChild(
          el("td", {
            colspan: "5",
            class: "catalogo-vazio",
            texto: "Nenhum caso de uso encontrado."
          })
        );
        corpo.appendChild(linhaVazia);
      }
    }
 
    busca.addEventListener("input", atualizar);
 
    limpar.addEventListener("click", function () {
      busca.value = "";
      atualizar();
      busca.focus();
    });
 
    atualizar();
  }
})();
 

