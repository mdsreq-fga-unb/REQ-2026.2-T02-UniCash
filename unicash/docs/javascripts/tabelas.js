/* Torna as tabelas do site ordenáveis (clique no cabeçalho) e adiciona um campo
 * de filtro às tabelas com muitas linhas. O catálogo tem filtros próprios. */

// O mkdocs-charts-plugin só define sua configuração nas páginas com gráficos, mas
// o script dele roda em todas; este padrão evita erros no console das demais.
window.mkdocs_chart_plugin = window.mkdocs_chart_plugin || {
  data_path: "", use_data_path: "True", vega_theme_light: "default", vega_theme_dark: "dark",
  vega_renderer: "svg", vega_width: "container", fallback_width: "800", path_to_homepage: "..",
  integrations: { mkdocs_material: { themes_light: ["default"], themes_dark: ["slate"] } }
};

(function () {
  "use strict";

  var MINIMO_PARA_FILTRO = 8;

  function normalizar(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  document.querySelectorAll("article table:not([class])").forEach(function (tabela) {
    if (!tabela.tHead) return;
    if (window.Tablesort) new Tablesort(tabela);

    var linhas = tabela.tBodies[0] ? tabela.tBodies[0].rows : [];
    if (linhas.length < MINIMO_PARA_FILTRO) return;

    var campo = document.createElement("input");
    campo.type = "search";
    campo.className = "md-input filtro-tabela";
    campo.placeholder = "Filtrar " + linhas.length + " linhas…";
    campo.setAttribute("aria-label", "Filtrar linhas da tabela");

    var contagem = document.createElement("span");
    contagem.className = "filtro-contagem";
    contagem.setAttribute("aria-live", "polite");

    var barra = document.createElement("div");
    barra.className = "filtro-barra";
    barra.appendChild(campo);
    barra.appendChild(contagem);

    // O Material envolve as tabelas em .md-typeset__scrollwrap; a barra fica antes dele.
    var alvo = tabela.closest(".md-typeset__scrollwrap") || tabela;
    alvo.parentNode.insertBefore(barra, alvo);

    campo.addEventListener("input", function () {
      var termos = normalizar(campo.value).split(/\s+/).filter(Boolean);
      var visiveis = 0;
      Array.prototype.forEach.call(linhas, function (tr) {
        var texto = normalizar(tr.textContent);
        var mostra = termos.every(function (t) { return texto.indexOf(t) >= 0; });
        tr.hidden = !mostra;
        if (mostra) visiveis++;
      });
      contagem.textContent = termos.length ? visiveis + " de " + linhas.length : "";
    });
  });
})();
