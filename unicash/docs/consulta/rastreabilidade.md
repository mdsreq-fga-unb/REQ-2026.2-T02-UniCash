---
title: Rastreabilidade 3D
hide:
  - toc
---

# Rastreabilidade 3D

O grafo mostra as relações registradas entre características de produto, casos de uso, requisitos funcionais, requisitos não funcionais e regras de negócio. Ele é gerado automaticamente a cada publicação, a partir das tabelas de requisitos e dos casos de uso, e por isso acompanha a versão vigente da documentação.

!!! info "Como usar"
    - **Arrastar** gira o grafo; **rolar** aproxima ou afasta; **clicar** em um nó centraliza e mostra seus detalhes; **duplo clique** abre a página do item.
    - Use a busca para localizar um código e os filtros para esconder tipos.
    - O modo 2D é mais leve e funciona melhor em celulares.

<div id="grafo" class="grafo" data-fonte="../dados/catalogo.json">
  <div class="grafo-controles">
    <input type="search" class="md-input grafo-busca" placeholder="Localizar (ex.: RF37)" aria-label="Localizar item no grafo">
    <div class="grafo-tipos" role="group" aria-label="Tipos exibidos"></div>
    <label class="grafo-opcao"><input type="checkbox" class="grafo-mvp"> Somente RFs do MVP</label>
    <button type="button" class="md-button grafo-modo">Mudar para 2D</button>
  </div>
  <div class="grafo-area" aria-label="Grafo de rastreabilidade"></div>
  <aside class="grafo-detalhe" aria-live="polite">Clique em um nó para ver os detalhes.</aside>
</div>

<script src="https://unpkg.com/force-graph@1.47.4/dist/force-graph.min.js"></script>
<script src="https://unpkg.com/3d-force-graph@1.73.4/dist/3d-force-graph.min.js"></script>
<script src="../../javascripts/grafo.js"></script>

## Visão geral da cadeia de rastreabilidade

```mermaid
flowchart LR
    OE[Objetivos específicos<br/>OE1–OE4] --> CP[Características de produto<br/>CP1–CP8]
    CP --> RF[Requisitos funcionais]
    UC[Casos de uso<br/>UC01–UC05] --> RF
    RN[Regras de negócio] -. condicionam .-> RF
    RNF[Requisitos não funcionais] -. qualificam .-> RF
    RF --> MVP{{Escopo do MVP}}
```
