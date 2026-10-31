"""Hook do MkDocs que transforma os requisitos do site em uma base consultável.

A cada build, este hook:

1. lê as páginas de requisitos (RF, RNF, RN, CP), os casos de uso e o MVP;
2. gera uma página por requisito em ``consulta/`` com descrição, relações e
   menções em outras páginas, e as inclui no menu lateral;
3. publica ``consulta/dados/*.json`` para o catálogo, o painel e o grafo 3D;
4. transforma toda menção a RFxx, RNFxx, RNxx, UCxx ou CPx no texto do site em
   link para a página do requisito, com o nome dele no tooltip.

As páginas de origem continuam sendo a fonte da verdade: nada aqui deve ser
editado à mão, basta alterar as tabelas originais.
"""

from __future__ import annotations

import json
import posixpath
import re
from collections import defaultdict
from pathlib import Path

from markdown.extensions.toc import slugify
from mkdocs.structure.files import File

CODIGO = re.compile(r"\b(RNF\d{2}|RF\d{2}|RN\d{2}|UC\d{2}|CP\d)\b")

TIPOS = {
    "CP": "Característica de Produto",
    "RF": "Requisito Funcional",
    "RNF": "Requisito Não Funcional",
    "RN": "Regra de Negócio",
    "UC": "Caso de Uso",
}

PLURAL = {
    "CP": "Características de Produto",
    "RF": "Requisitos Funcionais",
    "RNF": "Requisitos Não Funcionais",
    "RN": "Regras de Negócio",
    "UC": "Casos de Uso",
}

PASTA = {"CP": "cp", "RF": "rf", "RNF": "rnf", "RN": "rn", "UC": "uc"}

FONTE = {
    "CP": "requisitos_funcionais.md",
    "RF": "requisitos_funcionais.md",
    "RNF": "requisitos_nao_funcionais.md",
    "RN": "requisitos_funcionais.md",
    "UC": "casos_de_uso.md",
}

# Páginas geradas não entram na contagem de menções.
PREFIXO_GERADO = "consulta/"

itens: dict[str, dict] = {}


def tipo_de(codigo: str) -> str:
    return re.match(r"[A-Z]+", codigo).group(0)


def celulas(linha: str) -> list[str]:
    return [c.strip() for c in linha.strip().strip("|").split("|")]


def limpar(texto: str) -> str:
    """Remove a marcação Markdown mais comum para exibir texto puro."""
    texto = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", texto)
    texto = re.sub(r"\*\*|__|`", "", texto)
    return re.sub(r"\s+", " ", texto).strip()


def codigos(texto: str) -> list[str]:
    vistos: list[str] = []
    for c in CODIGO.findall(texto):
        if c not in vistos:
            vistos.append(c)
    return vistos


def secao(texto: str, titulo: str) -> str:
    """Retorna o trecho entre o título informado e o próximo título de mesmo nível."""
    m = re.search(rf"^(#+)\s+{re.escape(titulo)}.*$", texto, re.M)
    if not m:
        return ""
    nivel = len(m.group(1))
    resto = texto[m.end():]
    fim = re.search(rf"^#{{1,{nivel}}}\s", resto, re.M)
    return resto[: fim.start()] if fim else resto


def nome_e_descricao(corpo: str) -> tuple[str, str]:
    m = re.match(r"\*\*(.+?)\*\*:?\s*(.*)", corpo)
    if not m:
        return limpar(corpo), ""
    return limpar(m.group(1)).rstrip(":"), limpar(m.group(2))


def ler_requisitos(docs: Path) -> None:
    itens.clear()
    rf_md = (docs / "requisitos_funcionais.md").read_text(encoding="utf-8")
    rnf_md = (docs / "requisitos_nao_funcionais.md").read_text(encoding="utf-8")
    uc_md = (docs / "casos_de_uso.md").read_text(encoding="utf-8")
    mvp_md = (docs / "mvp.md").read_text(encoding="utf-8")

    for linha in secao(rf_md, "Características de Produto").splitlines():
        if re.match(r"^\|\s*CP\d\s*\|", linha):
            cod, nome = celulas(linha)[:2]
            itens[cod] = {"codigo": cod, "tipo": "CP", "nome": nome, "descricao": "",
                          "ancora": slugify("Características de Produto", "-")}

    for linha in rf_md.splitlines():
        if not re.match(r"^\|\s*\*\*RF\d{2}\*\*\s*\|", linha):
            continue
        partes = celulas(linha)
        cod, cp = partes[0].strip("*"), partes[-1]
        nome, desc = nome_e_descricao("|".join(partes[1:-1]))
        itens[cod] = {"codigo": cod, "tipo": "RF", "nome": nome, "descricao": desc,
                      "cp": cp, "ancora": cod.lower()}

    for linha in rnf_md.splitlines():
        if not re.match(r"^\|\s*\*\*RNF\d{2}\*\*\s*\|", linha):
            continue
        partes = celulas(linha)
        cod, classe, aplica = partes[0].strip("*"), partes[-2], partes[-1]
        nome, desc = nome_e_descricao("|".join(partes[1:-2]))
        itens[cod] = {"codigo": cod, "tipo": "RNF", "nome": nome, "descricao": desc,
                      "classificacao": limpar(classe), "aplica": limpar(aplica),
                      "sistema": aplica.strip().lower().startswith("sistema"),
                      "ancora": cod.lower()}

    for m in re.finditer(r"^###\s+(RN\d{2}):\s*(.+?)\s*$", rf_md, re.M):
        cod, titulo = m.group(1), m.group(2)
        resto = rf_md[m.end():]
        fim = re.search(r"^#{2,3}\s", resto, re.M)
        corpo = resto[: fim.start()] if fim else resto
        nome = re.sub(r"\s*\((?:RF|RNF)\d{2}[^)]*\)\s*$", "", titulo)
        itens[cod] = {"codigo": cod, "tipo": "RN", "nome": limpar(nome), "descricao": corpo.strip(),
                      "ancora": slugify(f"{cod}: {titulo}", "-"),
                      "relacionados": codigos(titulo + " " + corpo)}

    for m in re.finditer(r"^##\s+(UC\d{2})\s*-\s*(.+?)\s*$", uc_md, re.M):
        cod, nome = m.group(1), m.group(2)
        resto = uc_md[m.end():]
        fim = re.search(r"^##\s", resto, re.M)
        corpo = resto[: fim.start()] if fim else resto
        valor = re.search(r"\*\*Valor:\*\*\s*(.+)", corpo)
        itens[cod] = {"codigo": cod, "tipo": "UC", "nome": limpar(nome),
                      "descricao": limpar(valor.group(1)) if valor else "",
                      "ancora": slugify(f"{cod} - {nome}", "-"),
                      "relacionados": codigos(corpo)}

    # MVP: RFs listados na tabela "Resultado da priorização".
    mvp = set(codigos(secao(mvp_md, "1.3 Resultado da priorização")))
    notas = {m.group(1): (float(m.group(2)), float(m.group(3)))
             for m in re.finditer(r'\["(RF\d{2})","[^"]*",([\d.]+),([\d.]+)\]', mvp_md)}
    for cod, item in itens.items():
        if item["tipo"] == "RF":
            item["mvp"] = cod in mvp
            if cod in notas:
                item["valor"], item["esforco"] = (round(n, 2) for n in notas[cod])

    relacionar()


def relacionar() -> None:
    """Monta as relações nos dois sentidos entre os itens."""
    rel: dict[str, set[str]] = defaultdict(set)

    def liga(a: str, b: str) -> None:
        if a != b and a in itens and b in itens:
            rel[a].add(b)
            rel[b].add(a)

    for cod, item in itens.items():
        if item["tipo"] == "RF":
            liga(cod, item.get("cp", ""))
            for c in codigos(item["descricao"]):
                liga(cod, c)
        elif item["tipo"] == "RNF":
            for c in codigos(item["aplica"] + " " + item["descricao"]):
                liga(cod, c)
        elif item["tipo"] in ("RN", "UC"):
            for c in item.get("relacionados", []):
                liga(cod, c)

    for cod, item in itens.items():
        item["relacoes"] = sorted(rel[cod], key=ordem)


def ordem(cod: str) -> tuple:
    seq = ["CP", "UC", "RF", "RNF", "RN"]
    return (seq.index(tipo_de(cod)), int(re.sub(r"\D", "", cod)))


def caminho(cod: str) -> str:
    return f"consulta/{PASTA[tipo_de(cod)]}/{cod}.md"


def url(cod: str) -> str:
    return f"consulta/{PASTA[tipo_de(cod)]}/{cod}/"


def rotulo(cod: str) -> str:
    return f"{cod} — {itens[cod]['nome']}"


def relativo(destino: str, origem: str) -> str:
    return posixpath.relpath(destino, posixpath.dirname(origem))


# --------------------------------------------------------------------------- #
# Eventos do MkDocs
# --------------------------------------------------------------------------- #

def on_config(config, **kwargs):
    ler_requisitos(Path(config["docs_dir"]))
    ordenados = sorted(itens, key=ordem)

    def lista(tipo: str) -> list:
        return [{rotulo(c): caminho(c)} for c in ordenados if tipo_de(c) == tipo]

    por_cp: dict[str, list] = defaultdict(list)
    por_classe: dict[str, list] = defaultdict(list)
    for c in ordenados:
        if tipo_de(c) == "RF":
            por_cp[itens[c]["cp"]].append({rotulo(c): caminho(c)})
        elif tipo_de(c) == "RNF":
            por_classe[itens[c]["classificacao"]].append({rotulo(c): caminho(c)})

    consulta = [
        "consulta/index.md",
        {"Rastreabilidade 3D": "consulta/rastreabilidade.md"},
        {"Painel de indicadores": "consulta/painel.md"},
        {"Índice por etiqueta": "consulta/etiquetas.md"},
        {"Glossário": "consulta/glossario.md"},
        {"Características de produto": lista("CP")},
        {"Casos de uso": lista("UC")},
        {"Requisitos funcionais": [
            {f"{cp} — {itens[cp]['nome']}" if cp in itens else cp: rfs}
            for cp, rfs in sorted(por_cp.items())
        ]},
        {"Requisitos não funcionais": [{classe: rnfs} for classe, rnfs in sorted(por_classe.items())]},
        {"Regras de negócio": lista("RN")},
    ]
    config["nav"] = [n for n in config["nav"] if not (isinstance(n, dict) and "Consulta rápida" in n)]
    config["nav"].insert(1, {"Consulta rápida": consulta})
    return config


def on_files(files, config, **kwargs):
    mencoes = mapear_mencoes(files)
    for cod in itens:
        files.append(File.generated(config, caminho(cod), content=pagina(cod, mencoes.get(cod, []))))

    def publica(nome: str, dado) -> None:
        files.append(File.generated(config, f"consulta/dados/{nome}.json",
                                    content=json.dumps(dado, ensure_ascii=False)))

    files.append(File.generated(config, "consulta/glossario.md", content=glossario(config)))

    publica("catalogo", {
        "itens": [publico(itens[c], mencoes.get(c, [])) for c in sorted(itens, key=ordem)],
        "tipos": TIPOS,
        "plurais": PLURAL,
    })

    rf_por_cp: dict[str, dict] = defaultdict(lambda: {"mvp": 0, "fora": 0})
    for i in itens.values():
        if i["tipo"] == "RF":
            rf_por_cp[i["cp"]]["mvp" if i.get("mvp") else "fora"] += 1
    linhas = []
    for cp, n in sorted(rf_por_cp.items()):
        nome = f"{cp} — {itens[cp]['nome']}" if cp in itens else cp
        linhas += [{"cp": nome, "situacao": "No MVP", "quantidade": n["mvp"]},
                   {"cp": nome, "situacao": "Fora do MVP", "quantidade": n["fora"]}]
    publica("rf_por_cp", linhas)

    classes: dict[str, int] = defaultdict(int)
    for i in itens.values():
        if i["tipo"] == "RNF":
            classes[i["classificacao"]] += 1
    publica("rnf_por_classe", [{"classificacao": k, "quantidade": v} for k, v in sorted(classes.items())])

    publica("priorizacao", [
        {"codigo": i["codigo"], "nome": i["nome"], "valor": i["valor"], "esforco": i["esforco"],
         "situacao": "No MVP" if i.get("mvp") else "Fora do MVP"}
        for i in itens.values() if i["tipo"] == "RF" and "valor" in i
    ])

    publica("conexoes", [
        {"codigo": c, "tipo": TIPOS[tipo_de(c)], "conexoes": len(itens[c]["relacoes"])}
        for c in sorted(itens, key=lambda c: -len(itens[c]["relacoes"]))[:15]
    ])
    return files


def on_page_content(html, page, config, files, **kwargs):
    if page.file.src_uri in (FONTE["RF"], FONTE["RNF"]):
        html = re.sub(r"<tr>(\s*<td><strong>((?:RNF|RF)\d{2})</strong>)",
                      lambda m: f'<tr id="{m.group(2).lower()}">{m.group(1)}', html)
    proprio = Path(page.file.src_uri).stem if page.file.src_uri.startswith(PREFIXO_GERADO) else None
    return autolink(html, page.url, proprio)


# --------------------------------------------------------------------------- #
# Geração de conteúdo
# --------------------------------------------------------------------------- #

def glossario(config) -> str:
    """Gera a página de glossário a partir das abreviações usadas nos tooltips."""
    arquivo = Path(config["config_file_path"]).parent / "includes" / "abreviacoes.md"
    termos = re.findall(r"^\*\[(.+?)\]:\s*(.+)$", arquivo.read_text(encoding="utf-8"), re.M)
    linhas = ["# Glossário", "",
              "Termos e siglas usados na documentação. Em qualquer página, passe o mouse sobre a sigla "
              "para ver o significado.", "",
              "| Sigla | Significado |", "|---|---|"]
    linhas += [f"| `{t}` | {d} |" for t, d in sorted(termos, key=lambda x: x[0].lower())]
    return "\n".join(linhas) + "\n"


def mapear_mencoes(files) -> dict[str, list[tuple[str, str]]]:
    """Para cada código, lista as páginas (título, caminho) que o mencionam."""
    resultado: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for f in files.documentation_pages():
        if f.src_uri.startswith(PREFIXO_GERADO) or not f.abs_src_path:
            continue
        texto = Path(f.abs_src_path).read_text(encoding="utf-8")
        texto = re.sub(r"<script.*?</script>", "", texto, flags=re.S)
        titulo = re.search(r"^#\s+(.+)$", texto, re.M)
        nome = limpar(titulo.group(1)) if titulo else f.src_uri
        for cod in codigos(texto):
            if cod in itens:
                resultado[cod].append((nome, f.src_uri))
    return resultado


def publico(item: dict, mencoes: list) -> dict:
    campos = ("codigo", "tipo", "nome", "descricao", "cp", "classificacao", "aplica",
              "sistema", "mvp", "valor", "esforco", "relacoes")
    dado = {k: item[k] for k in campos if k in item}
    if item["tipo"] == "RN":
        texto = re.sub(r"^\|.*\|$", "", item["descricao"], flags=re.M)
        dado["descricao"] = limpar(re.sub(r"^\s*[-*]\s+", "", texto, flags=re.M))
    dado["url"] = url(item["codigo"])
    dado["mencoes"] = len(mencoes)
    return dado


def link(cod: str, de: str) -> str:
    return f"[{cod}]({relativo(caminho(cod), de)})"


def pagina(cod: str, mencoes: list[tuple[str, str]]) -> str:
    item = itens[cod]
    tipo = item["tipo"]
    origem = caminho(cod)

    etiquetas = [TIPOS[tipo]]
    if tipo == "RF":
        etiquetas += [item["cp"], "MVP" if item.get("mvp") else "Fora do MVP"]
    if tipo == "RNF":
        etiquetas.append(item["classificacao"])

    titulo = f"{cod} — {item['nome']}".replace('"', "'")
    linhas = ["---", f'title: "{titulo}"', "tags:"]
    linhas += [f"  - {e}" for e in etiquetas]
    linhas += ["---", "", f"# {cod} — {item['nome']}", ""]

    selos = [f'<span class="selo selo-{tipo.lower()}">{TIPOS[tipo]}</span>']
    if tipo == "RF":
        selos.append(f'<span class="selo">{item["cp"]} · {itens.get(item["cp"], {}).get("nome", "")}</span>')
        selos.append('<span class="selo selo-mvp">No MVP</span>' if item.get("mvp")
                     else '<span class="selo selo-fora">Fora do MVP</span>')
    if tipo == "RNF":
        selos.append(f'<span class="selo">{item["classificacao"]}</span>')
    linhas += ['<div class="selos">' + " ".join(selos) + "</div>", ""]

    if tipo == "RN":
        linhas += [item["descricao"], ""]
    elif item["descricao"]:
        linhas += [f'!!! quote "{"Valor" if tipo == "UC" else "Descrição"}"', "",
                   f"    {item['descricao']}", ""]
    if tipo == "CP":
        rfs = [c for c in item["relacoes"] if tipo_de(c) == "RF"]
        no_mvp = sum(1 for c in rfs if itens[c].get("mvp"))
        linhas += [f"Esta característica reúne **{len(rfs)} requisitos funcionais**, "
                   f"dos quais **{no_mvp}** estão no MVP.", ""]
    if tipo == "RNF":
        linhas += [f"**Aplica-se a:** {item['aplica']}", ""]
    if tipo == "RF" and "valor" in item:
        v, e = (str(item[k]).replace(".", ",") for k in ("valor", "esforco"))
        linhas += [f"**Priorização:** valor de negócio **{v}** · esforço técnico **{e}** "
                   f"(médias de 1 a 4, ver [Escopo do MVP]({relativo('mvp.md', origem)})).", ""]

    grupos: dict[str, list] = defaultdict(list)
    for c in item["relacoes"]:
        grupos[tipo_de(c)].append(c)
    if grupos:
        linhas += ["## Relações", ""]
        for t in ("CP", "UC", "RF", "RNF", "RN"):
            if grupos.get(t):
                linhas += [f'=== "{PLURAL[t]} ({len(grupos[t])})"', "",
                           "    | Código | Nome |", "    |---|---|"]
                linhas += [f"    | {link(c, origem)} | {itens[c]['nome']} |" for c in grupos[t]]
                linhas += [""]
    if tipo == "RF":
        gerais = [c for c in sorted(itens, key=ordem) if itens[c]["tipo"] == "RNF" and itens[c].get("sistema")]
        if gerais:
            linhas += [f'??? info "Requisitos não funcionais que valem para o sistema inteiro ({len(gerais)})"',
                       "", "    " + ", ".join(link(c, origem) for c in gerais), ""]

    if mencoes:
        linhas += ["## Onde é mencionado", ""]
        linhas += [f"- [{nome}]({relativo(src, origem)})" for nome, src in mencoes]
        linhas += [""]

    fonte = relativo(FONTE[tipo], origem)
    linhas += ["---", "",
               f"[:material-file-document-outline: Ver na página original]({fonte}#{item['ancora']})"
               "{ .md-button }",
               f"[:material-magnify: Voltar ao catálogo]({relativo('consulta/index.md', origem)})"
               "{ .md-button }", ""]
    return "\n".join(linhas)


# --------------------------------------------------------------------------- #
# Links automáticos no HTML
# --------------------------------------------------------------------------- #

IGNORAR = {"a", "script", "style", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6",
           "textarea", "title", "svg"}
TAG = re.compile(r"(<[^>]+>)")


BLOCO_CRU = re.compile(r"(<script\b.*?</script>|<style\b.*?</style>)", re.S | re.I)


def autolink(html: str, pagina_url: str, proprio: str | None) -> str:
    # Scripts e estilos saem inteiros antes da tokenização: o código JavaScript
    # pode conter "<" e ">" que seriam confundidos com tags.
    partes = BLOCO_CRU.split(html)
    return "".join(p if i % 2 else autolink_trecho(p, pagina_url, proprio) for i, p in enumerate(partes))


def autolink_trecho(html: str, pagina_url: str, proprio: str | None) -> str:
    base = pagina_url if (not pagina_url or pagina_url.endswith("/")) else posixpath.dirname(pagina_url) + "/"
    pilha: list[str] = []
    saida = []
    for parte in TAG.split(html):
        if parte.startswith("<"):
            m = re.match(r"<\s*(/)?\s*([a-zA-Z0-9]+)", parte)
            if m and m.group(2).lower() in IGNORAR:
                nome = m.group(2).lower()
                if m.group(1):
                    if nome in pilha:
                        while pilha and pilha.pop() != nome:
                            pass
                elif not parte.endswith("/>"):
                    pilha.append(nome)
            saida.append(parte)
        elif pilha or not parte.strip():
            saida.append(parte)
        else:
            saida.append(CODIGO.sub(lambda m: ancora(m.group(1), base, proprio), parte))
    return "".join(saida)


def ancora(cod: str, base: str, proprio: str | None) -> str:
    if cod not in itens or cod == proprio:
        return cod
    destino = posixpath.relpath(url(cod), base.rstrip("/") or ".") + "/"
    nome = itens[cod]["nome"].replace('"', "&quot;")
    return f'<a class="ref ref-{tipo_de(cod).lower()}" href="{destino}" title="{nome}">{cod}</a>'
