"""Testes do módulo github_status (rodar em unicash/: python3 -m unittest discover -s hooks/tests -v)."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from github_status import derivar_status  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
