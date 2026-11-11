
/* Catálogo de casos de uso do UniCash.
 * Lê consulta/dados/catalogo.json, gerado pelo hook rastreabilidade.py.
 */
(function () {
  "use strict";

  var raiz = document.getElementById("catalogo");
  if (!raiz) return;

  var ORDEM_TIPOS = ["CP", "RF", "RNF", "RN"];

  var NOMES_TIPOS = {
    CP: "Características de produto",
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

    var casos = itens.filter(function (item) {
      return item.tipo === "UC";
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

    var lista = el("div", {
      class: "catalogo-casos"
    });

    var limpar = el("button", {
      type: "button",
      class: "md-button catalogo-limpar",
      texto: "Limpar busca"
    });

    raiz.innerHTML = "";

    raiz.appendChild(busca);

    raiz.appendChild(
      el("div", { class: "catalogo-acoes" }, [
        contagem,
        limpar
      ])
    );

    raiz.appendChild(lista);

    function nomeTipo(codigo) {
      return codigo.replace(/\d/g, "");
    }

    function criarLink(item) {
      var link = el("a", {
        href: "../" + item.url,
        class: "ref ref-" + item.tipo.toLowerCase(),
        texto: item.codigo + " — " + item.nome
      });

      return link;
    }

    function criarRelacionados(caso) {
      var painel = el("div", {
        class: "catalogo-detalhes"
      });

      if (caso.descricao) {
        painel.appendChild(
          el("p", {
            class: "catalogo-descricao",
            texto: caso.descricao
          })
        );
      }

      var grupos = {};

      (caso.relacoes || []).forEach(function (codigo) {
        var item = porCodigo[codigo];

        if (!item) return;

        var tipo = item.tipo;

        if (!grupos[tipo]) {
          grupos[tipo] = [];
        }

        grupos[tipo].push(item);
      });

      var encontrou = false;

      ORDEM_TIPOS.forEach(function (tipo) {
        var relacionados = grupos[tipo];

        if (!relacionados || !relacionados.length) return;

        encontrou = true;

        var grupo = el("section", {
          class: "catalogo-grupo"
        });

        grupo.appendChild(
          el("h4", {
            class: "catalogo-grupo-titulo",
            texto: NOMES_TIPOS[tipo] +
              " (" + relacionados.length + ")"
          })
        );

        var itensGrupo = el("ul", {
          class: "catalogo-relacionados"
        });

        relacionados.forEach(function (item) {
          var linha = el("li", {
            class: "catalogo-relacionado"
          });

          linha.appendChild(criarLink(item));

          if (item.tipo === "RF") {
            linha.appendChild(
              el("span", {
                class: "selo " +
                  (item.mvp ? "selo-mvp" : "selo-fora"),
                texto: item.mvp ? "No MVP" : "Fora do MVP"
              })
            );
          }

          if (item.descricao) {
            linha.appendChild(
              el("p", {
                class: "catalogo-relacionado-descricao",
                texto: item.descricao
              })
            );
          }

          itensGrupo.appendChild(linha);
        });

        grupo.appendChild(itensGrupo);
        painel.appendChild(grupo);
      });

      if (!encontrou) {
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
      var texto = normalizar([
        caso.codigo,
        caso.nome,
        caso.descricao
      ].join(" "));

      var relacionados = (caso.relacoes || []).map(function (codigo) {
        var item = porCodigo[codigo];

        return item
          ? [item.codigo, item.nome, item.descricao].join(" ")
          : codigo;
      }).join(" ");

      return normalizar(texto + " " + relacionados).includes(termo);
    }

    function atualizar() {
      var termo = normalizar(busca.value.trim());

      var filtrados = casos.filter(function (caso) {
        return !termo || corresponde(caso, termo);
      });

      lista.innerHTML = "";

      contagem.textContent =
        filtrados.length + " de " + casos.length + " casos de uso";

      filtrados.forEach(function (caso) {
        var quantidade = (caso.relacoes || []).length;

        var resumo = el("summary", {
          class: "catalogo-resumo"
        });

        resumo.appendChild(
          el("span", {
            class: "catalogo-codigo",
            texto: caso.codigo
          })
        );

        resumo.appendChild(
          el("span", {
            class: "catalogo-nome",
            texto: caso.nome
          })
        );

        resumo.appendChild(
          el("span", {
            class: "catalogo-quantidade",
            texto: quantidade + " relações"
          })
        );

        var detalhes = el("details", {
          class: "catalogo-caso"
        }, [
          resumo,
          criarRelacionados(caso)
        ]);

        lista.appendChild(detalhes);
      });

      if (!filtrados.length) {
        lista.appendChild(
          el("p", {
            class: "catalogo-vazio",
            texto: "Nenhum caso de uso encontrado."
          })
        );
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
