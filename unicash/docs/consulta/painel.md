---
title: Painel de indicadores
---

# Painel de indicadores

Os gráficos abaixo são gerados a cada publicação a partir das tabelas de requisitos, dos casos de uso e do [Escopo do MVP](../mvp.md). Passe o mouse sobre as barras e os pontos para ver os valores; use o menu `...` de cada gráfico para salvar como imagem.

## Requisitos funcionais por característica de produto

```vegalite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "Quantidade de RFs por característica de produto, separando os que estão no MVP.",
  "width": "container",
  "height": 280,
  "data": {"url": "consulta/dados/rf_por_cp.json"},
  "mark": {"type": "bar", "tooltip": true},
  "encoding": {
    "y": {"field": "cp", "type": "nominal", "title": null, "sort": null, "axis": {"labelLimit": 320}},
    "x": {"field": "quantidade", "type": "quantitative", "title": "Requisitos funcionais", "stack": "zero"},
    "color": {
      "field": "situacao", "type": "nominal", "title": "Situação",
      "scale": {"domain": ["No MVP", "Fora do MVP"], "range": ["#2563eb", "#cbd5e1"]}
    },
    "order": {"field": "situacao", "sort": "descending"}
  }
}
```

## Matriz valor × esforço

Cada ponto é um requisito avaliado na priorização ([R05](../registros.md#r05-priorizacao-do-mvp-com-a-cliente-e-representante-25092026)). Arraste para selecionar uma região e veja os requisitos dela no tooltip.

```vegalite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 380,
  "data": {"url": "consulta/dados/priorizacao.json"},
  "params": [{"name": "zoom", "select": "interval", "bind": "scales"}],
  "mark": {"type": "circle", "size": 120, "opacity": 0.8, "tooltip": true},
  "encoding": {
    "x": {"field": "esforco", "type": "quantitative", "title": "Esforço técnico (média)", "scale": {"domain": [0.8, 4.2]}},
    "y": {"field": "valor", "type": "quantitative", "title": "Valor de negócio (média)", "scale": {"domain": [0.8, 4.2]}},
    "color": {
      "field": "situacao", "type": "nominal", "title": "Situação",
      "scale": {"domain": ["No MVP", "Fora do MVP"], "range": ["#2563eb", "#f97316"]}
    },
    "tooltip": [
      {"field": "codigo", "title": "Código"},
      {"field": "nome", "title": "Requisito"},
      {"field": "valor", "title": "Valor", "format": ".2f"},
      {"field": "esforco", "title": "Esforço", "format": ".2f"}
    ]
  }
}
```

<div class="grid" markdown>

<div markdown>

## RNFs por classificação

```vegalite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 240,
  "data": {"url": "consulta/dados/rnf_por_classe.json"},
  "mark": {"type": "arc", "innerRadius": 55, "tooltip": true},
  "encoding": {
    "theta": {"field": "quantidade", "type": "quantitative"},
    "color": {"field": "classificacao", "type": "nominal", "title": "Classificação", "scale": {"scheme": "tableau10"}}
  }
}
```

</div>

<div markdown>

## Itens mais conectados

```vegalite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 240,
  "data": {"url": "consulta/dados/conexoes.json"},
  "mark": {"type": "bar", "tooltip": true, "color": "#0891b2"},
  "encoding": {
    "y": {"field": "codigo", "type": "nominal", "sort": "-x", "title": null},
    "x": {"field": "conexoes", "type": "quantitative", "title": "Relações"}
  }
}
```

</div>

</div>

## Planilha de priorização

=== "Tabela"

    A tabela é lida do arquivo `docs/dados/priorizacao.csv`, exportado da planilha de priorização. Clique no cabeçalho para ordenar e use o campo de filtro para buscar.

    {{ read_csv('priorizacao.csv', decimal=',') }}

=== "Planilha original"

    <iframe class="planilha" src="https://docs.google.com/spreadsheets/d/1uoo81vAhU673u4y6JfPPllNKDKD-qf1iN6xD9fmMXCw/preview" title="Planilha de priorização do UniCash" loading="lazy"></iframe>

    [Abrir a planilha em uma nova aba](https://docs.google.com/spreadsheets/d/1uoo81vAhU673u4y6JfPPllNKDKD-qf1iN6xD9fmMXCw/edit?usp=sharing){ .md-button target="_blank" rel="noopener" }
