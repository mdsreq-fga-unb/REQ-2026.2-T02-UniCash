"""Testes do módulo github_status (rodar em unicash/: python3 -m unittest discover -s hooks/tests -v)."""

import json
import os
import sys
import unittest
import urllib.error
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import github_status  # noqa: E402
from github_status import carregar, coletar, derivar_status, quadro_html, slug_status  # noqa: E402

REPO = "mdsreq-fga-unb/REQ-2026.2-T02-UniCash"
URL_PUBLICADA = "https://exemplo.invalid/consulta/dados/github.json"
FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "graphql_issues.json").read_text(encoding="utf-8"))
PUBLICADO_OK = {"coletado_em": "2026-11-13T10:00:00-03:00", "fonte": "api",
                "casos": {"UC01": {"status": "Planejado", "issue": {"numero": 28}, "prs": []}}}


class TestDerivarStatus(unittest.TestCase):
    def pr(self, **k):
        return {"estado": "OPEN", "base": "develop", "na_main": False, **k}

    def test_sem_issue(self):
        self.assertEqual(derivar_status({"issue": None, "prs": []}), "Sem issue")

    def test_none_e_nao_informado(self):
        self.assertEqual(derivar_status(None), "Não informado")

    def test_issue_sem_pr(self):
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": []}), "Planejado")

    def test_pr_aberto(self):
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": [self.pr()]}), "Em desenvolvimento")

    def test_pr_fechado_sem_merge_nao_conta(self):
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": [self.pr(estado="CLOSED")]}), "Planejado")

    def test_merge_na_develop(self):
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": [self.pr(estado="MERGED")]}),
                         "Implementado na develop")

    def test_merge_presente_na_main(self):
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": [self.pr(estado="MERGED", na_main=True)]}),
                         "Publicado na main")

    def test_merge_direto_na_main(self):
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": [self.pr(estado="MERGED", base="main")]}),
                         "Publicado na main")

    def test_vale_o_pr_mais_avancado(self):
        prs = [self.pr(), self.pr(estado="MERGED"), self.pr(estado="CLOSED")]
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": prs}), "Implementado na develop")


def comparacao(status):
    """Substitui _get_json: devolve o resultado da API de comparação."""
    return lambda url, token, timeout: {"status": status}


class TestColetar(unittest.TestCase):
    def coleta(self, status_comparacao="ahead", codigos=("UC01",)):
        with patch.object(github_status, "_post_graphql", return_value=FIXTURE), \
             patch.object(github_status, "_get_json", side_effect=comparacao(status_comparacao)):
            return coletar(REPO, "token-falso", list(codigos))

    def test_coletar_monta_caso_uc01(self):
        dados = self.coleta()
        self.assertEqual(dados["fonte"], "api")
        caso = dados["casos"]["UC01"]
        self.assertEqual(caso["issue"]["numero"], 28)
        self.assertEqual([pr["numero"] for pr in caso["prs"]], [48])
        pr = caso["prs"][0]
        self.assertEqual((pr["base"], pr["estado"], pr["na_main"], pr["ci"]), ("develop", "MERGED", False, "SUCCESS"))
        self.assertEqual(caso["status"], "Implementado na develop")

    def test_coletar_na_main_quando_behind(self):
        self.assertEqual(self.coleta("behind")["casos"]["UC01"]["status"], "Publicado na main")

    def test_coletar_duplicata_usa_menor_numero(self):
        self.assertEqual(self.coleta()["casos"]["UC01"]["issue"]["numero"], 28)

    def test_coletar_ignora_codigo_fora_do_site(self):
        self.assertNotIn("UC99", self.coleta()["casos"])

    def test_coletar_uc_sem_issue(self):
        caso = self.coleta(codigos=("UC01", "UC10"))["casos"]["UC10"]
        self.assertEqual(caso, {"status": "Sem issue", "issue": None, "prs": []})

    def test_coletar_uc_sem_pr_planejado(self):
        self.assertEqual(self.coleta(codigos=("UC02",))["casos"]["UC02"]["status"], "Planejado")


class TestCarregar(unittest.TestCase):
    def test_carregar_sem_token_usa_publicado(self):
        with patch.dict(os.environ, {}, clear=True), \
             patch.object(github_status, "_post_graphql") as api, \
             patch.object(github_status, "_get_json", return_value=PUBLICADO_OK):
            dados = carregar(REPO, ["UC01"], URL_PUBLICADA)
        self.assertEqual(dados["fonte"], "publicado")
        self.assertEqual(dados["casos"]["UC01"]["issue"]["numero"], 28)
        api.assert_not_called()

    def test_carregar_api_falha_usa_publicado(self):
        with patch.dict(os.environ, {"GITHUB_TOKEN": "x"}, clear=True), \
             patch.object(github_status, "_post_graphql", side_effect=urllib.error.URLError("fora do ar")), \
             patch.object(github_status, "_get_json", return_value=PUBLICADO_OK):
            self.assertEqual(carregar(REPO, ["UC01"], URL_PUBLICADA)["fonte"], "publicado")

    def test_carregar_tudo_falha(self):
        erro = urllib.error.URLError("fora do ar")
        with patch.dict(os.environ, {"GH_TOKEN": "x"}, clear=True), \
             patch.object(github_status, "_post_graphql", side_effect=erro), \
             patch.object(github_status, "_get_json", side_effect=erro):
            self.assertEqual(carregar(REPO, ["UC01"], URL_PUBLICADA),
                             {"coletado_em": None, "fonte": "indisponivel", "casos": {}})

    def test_carregar_publicado_malformado(self):
        with patch.dict(os.environ, {}, clear=True), \
             patch.object(github_status, "_get_json", return_value={"x": 1}):
            self.assertEqual(carregar(REPO, ["UC01"], URL_PUBLICADA)["fonte"], "indisponivel")


class TestQuadro(unittest.TestCase):
    def dados_api(self):
        with patch.object(github_status, "_post_graphql", return_value=FIXTURE), \
             patch.object(github_status, "_get_json", side_effect=comparacao("ahead")):
            return coletar(REPO, "token-falso", ["UC01", "UC10"])

    def test_slug_status(self):
        self.assertEqual(slug_status("Não informado"), "nao-informado")
        self.assertEqual(slug_status("Implementado na develop"), "implementado-na-develop")
        self.assertEqual(slug_status("Publicado na main"), "publicado-na-main")

    def test_quadro_com_pr(self):
        html = quadro_html("UC01", self.dados_api())
        self.assertIn("catalogo-status-implementado-na-develop", html)
        self.assertIn('href="https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/48"', html)
        self.assertIn('href="https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/28"', html)
        self.assertIn("#28", html)
        self.assertIn("09/11/2026", html)
        self.assertIn("develop", html)
        self.assertIn("Natan8643", html)
        self.assertIn("CI passou", html)
        self.assertIn("Dados do GitHub de", html)

    def test_quadro_uc_sem_issue(self):
        html = quadro_html("UC10", self.dados_api())
        self.assertIn("catalogo-status-sem-issue", html)
        self.assertIn("Sem issue no GitHub", html)

    def test_quadro_indisponivel(self):
        html = quadro_html("UC01", {"coletado_em": None, "fonte": "indisponivel", "casos": {}})
        self.assertIn("Dados do GitHub indisponíveis neste build", html)
        self.assertIn("catalogo-status-nao-informado", html)

    def test_quadro_publicado_avisa_data(self):
        html = quadro_html("UC01", {**PUBLICADO_OK, "fonte": "publicado"})
        self.assertIn("13/11/2026 10:00", html)

    def test_quadro_escapa_html(self):
        dados = self.dados_api()
        dados["casos"]["UC01"]["prs"][0]["titulo"] = "<script>x</script>"
        html = quadro_html("UC01", dados)
        self.assertIn("&lt;script&gt;", html)
        self.assertNotIn("<script>", html)

    def test_quadro_sem_linha_em_branco(self):
        self.assertNotIn("\n\n", quadro_html("UC01", self.dados_api()))


if __name__ == "__main__":
    unittest.main()
