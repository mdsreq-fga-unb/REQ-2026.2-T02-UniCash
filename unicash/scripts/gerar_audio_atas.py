"""Gera a narração (MP3) do resumo de cada ata com vozes neurais do Edge TTS.

Uso, a partir da pasta unicash/:

    pip install edge-tts
    python scripts/gerar_audio_atas.py            # gera só os áudios que faltam ou mudaram
    python scripts/gerar_audio_atas.py --todos    # regera todos
    python scripts/gerar_audio_atas.py --voz pt-BR-AntonioNeural

O texto narrado é o bloco `!!! abstract "Resumo"` de cada post em docs/atas/posts/.
Os MP3 ficam em docs/atas/audio/ e devem ser versionados junto com a ata. O texto do
resumo é enviado ao serviço de síntese da Microsoft, então ele não deve conter dados
pessoais além dos que já estão publicados no site.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import re
from pathlib import Path

import edge_tts

RAIZ = Path(__file__).resolve().parent.parent / "docs" / "atas"
POSTS = RAIZ / "posts"
AUDIO = RAIZ / "audio"
# Assinatura do texto e da voz de cada áudio gerado, para regerar só o que mudou.
REGISTRO = Path(__file__).resolve().parent / "audio_atas.json"
VOZ_PADRAO = "pt-BR-FranciscaNeural"

MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]


def texto_da_ata(arquivo: Path) -> str | None:
    md = arquivo.read_text(encoding="utf-8")
    resumo = re.search(r'^!!! abstract "Resumo"\n\n((?:    .*\n|\n)+)', md, re.M)
    if not resumo:
        return None
    linhas = [l.strip() for l in resumo.group(1).splitlines() if l.strip() and not l.strip().startswith("<")]
    titulo = re.search(r"^# (R\d\d) — (.+)$", md, re.M)
    data = re.search(r"^date: (\d{4})-(\d{2})-(\d{2})", md, re.M)
    abertura = ""
    if titulo:
        abertura = f"Ata {titulo.group(1)[1:].lstrip('0')}: {re.sub(r'\s*\(.*\)$', '', titulo.group(2))}."
    if data and titulo and "anterior" not in titulo.group(2):
        abertura += f" {int(data.group(3))} de {MESES[int(data.group(2)) - 1]} de {data.group(1)}."
    return f"{abertura} {' '.join(linhas)}".strip()


async def gerar(voz: str, todos: bool) -> None:
    AUDIO.mkdir(exist_ok=True)
    registro = json.loads(REGISTRO.read_text(encoding="utf-8")) if REGISTRO.exists() else {}
    for arquivo in sorted(POSTS.glob("r*.md")):
        texto = texto_da_ata(arquivo)
        if not texto:
            print(f"{arquivo.name}: sem bloco de resumo, ignorado")
            continue
        destino = AUDIO / f"{arquivo.stem}.mp3"
        assinatura = hashlib.sha256(f"{voz}\n{texto}".encode()).hexdigest()
        if not todos and destino.exists() and registro.get(arquivo.stem) == assinatura:
            print(f"{arquivo.name}: sem mudanças")
            continue
        await edge_tts.Communicate(texto, voz, rate="+0%").save(str(destino))
        registro[arquivo.stem] = assinatura
        print(f"{arquivo.name}: gerado {destino.relative_to(RAIZ.parent.parent)}")
    REGISTRO.write_text(json.dumps(registro, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--voz", default=VOZ_PADRAO, help="voz do Edge TTS (padrão: %(default)s)")
    parser.add_argument("--todos", action="store_true", help="regera todos os áudios")
    args = parser.parse_args()
    asyncio.run(gerar(args.voz, args.todos))
