"""Exercise real Git states and the fail-closed review protocol, without network."""

import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/security_gate.py"
SPEC = importlib.util.spec_from_file_location("security_gate", SCRIPT)
gate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gate)


class GateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name) / "repo"
        self.repo.mkdir()
        self.git("init", "-b", "main")
        self.git("config", "user.name", "Security gate test")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "commit.gpgsign", "false")
        self.git("config", "core.hooksPath", str(Path(self.temp.name) / "no-hooks"))
        self.commit("initial.txt", "base")
        self.git("switch", "-c", "feature/test")
        self.commit("feature.txt", "feature")

    def git(self, *args):
        return subprocess.run(["git", "-C", str(self.repo), *args], capture_output=True, check=True).stdout

    def commit(self, name, content):
        (self.repo / name).write_text(content)
        self.git("add", "--", name)
        self.git("commit", "-m", "fixture")

    def scope(self, **kwargs):
        return gate.scope(self.repo, kwargs.get("base", "main"), kwargs.get("head", "HEAD"), kwargs.get("mode", "diff"))

    def report(self):
        return {"scope": self.scope(), "manual_review": "Reviewed the fixture diff and related paths",
                "coverage": [{"area": f"A{i:02}", "status": "na", "evidence": "Text-only fixture"} for i in range(1, 11)],
                "checks": [{"name": "fixture review", "status": "pass", "required": True, "evidence": "Reviewed files"}],
                "findings": []}

    def test_complete_report_passes(self):
        gate.validate(self.report(), self.scope())

    def test_source_change_invalidates_report(self):
        report = self.report()
        self.commit("feature.txt", "changed after review")
        with self.assertRaises(gate.Blocked):
            gate.validate(report, self.scope())

    def test_target_change_invalidates_report_and_is_in_scope(self):
        report = self.report()
        self.git("switch", "main")
        self.commit("integration.txt", "changed target")
        self.git("switch", "feature/test")
        current = self.scope()
        self.assertIn("integration.txt", current["files"])
        with self.assertRaises(gate.Blocked):
            gate.validate(report, current)

    def test_dirty_and_untracked_states_block(self):
        for name in ("initial.txt", "untracked.txt"):
            with self.subTest(name=name):
                path = self.repo / name
                original = path.read_text() if path.exists() else None
                path.write_text("not committed")
                with self.assertRaises(gate.Blocked):
                    self.scope()
                if original is None:
                    path.unlink()
                else:
                    path.write_text(original)

    def test_staged_changes_block(self):
        (self.repo / "initial.txt").write_text("staged")
        self.git("add", "initial.txt")
        with self.assertRaises(gate.Blocked):
            self.scope()

    def test_high_and_critical_cannot_be_accepted(self):
        for severity in ("high", "critical"):
            report = self.report()
            report["findings"] = [{"id": "F1", "location": "fixture:1", "evidence": "reachable flaw",
                                   "confidence": "high", "severity": severity, "disposition": "accepted",
                                   "owner_acceptance": "owner message"}]
            with self.assertRaises(gate.Blocked):
                gate.validate(report, self.scope())
            report["findings"][0].update(disposition="resolved", verification="Regression check passed")
            gate.validate(report, self.scope())

    def test_medium_needs_explicit_acceptance_or_fix(self):
        report = self.report()
        finding = {"id": "F1", "location": "fixture:1", "evidence": "limited impact",
                   "confidence": "high", "severity": "medium", "disposition": "open"}
        report["findings"] = [finding]
        with self.assertRaises(gate.Blocked):
            gate.validate(report, self.scope())
        finding.update(disposition="accepted", owner_acceptance="Explicit owner response reference")
        gate.validate(report, self.scope())

    def test_required_checks_fail_closed(self):
        for status in ("fail", "not_run", "na"):
            report = self.report()
            report["checks"][0]["status"] = status
            with self.assertRaises(gate.Blocked):
                gate.validate(report, self.scope())

    def test_missing_review_or_coverage_blocks(self):
        for key in ("manual_review", "coverage", "checks", "findings"):
            report = self.report()
            del report[key]
            with self.assertRaises(gate.Blocked):
                gate.validate(report, self.scope())

    def test_invalid_ref_is_rejected(self):
        with self.assertRaises(gate.Blocked):
            self.scope(head="--help")

    def test_baseline_without_target(self):
        result = self.scope(base=None, mode="baseline")
        self.assertIsNone(result["target"])
        self.assertEqual(set(result["files"]), {"initial.txt", "feature.txt"})
        with self.assertRaises(gate.Blocked):
            self.scope(base=None)

    def test_worktree_and_cli_round_trip(self):
        linked = Path(self.temp.name) / "linked"
        self.git("worktree", "add", "-b", "feature/linked", str(linked), "HEAD")
        scoped = gate.scope(linked, "main", "HEAD", "diff")
        self.assertEqual(scoped["repo"], str(linked.resolve()))
        report = self.report()
        report["scope"] = scoped
        report_path = Path(self.temp.name) / "report.json"
        receipt = Path(self.temp.name) / "receipt.json"
        report_path.write_text(json.dumps(report))

        def cli(command, *extra):
            return subprocess.run(["python3", str(SCRIPT), command, "--repo", str(linked),
                                   "--base", "main", "--receipt", str(receipt), *extra], capture_output=True)

        self.assertNotEqual(cli("verify").returncode, 0)
        self.assertEqual(cli("record", "--report", str(report_path)).returncode, 0)
        self.assertEqual(cli("verify").returncode, 0)
        receipt.write_text("{broken")
        self.assertNotEqual(cli("verify").returncode, 0)


if __name__ == "__main__":
    unittest.main()
