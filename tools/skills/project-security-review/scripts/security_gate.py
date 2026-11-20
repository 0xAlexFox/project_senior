#!/usr/bin/env python3
"""Bind a human security review to local Git commits; never runs a scanner or merge."""

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

VERSION = 1
AREAS = {f"A{number:02}" for number in range(1, 11)}


class Blocked(Exception):
    pass


def git(repo, *args):
    result = subprocess.run(["git", "-C", str(repo), *args], capture_output=True)
    if result.returncode:
        # Git stderr can contain remote URLs/credentials or untrusted file content.
        raise Blocked("Git operation failed; inspect repository/ref locally")
    return result.stdout


def text(value):
    return isinstance(value, str) and bool(value.strip())


def scope(repo, base, head, mode):
    root = Path(git(repo, "rev-parse", "--show-toplevel").decode().strip()).resolve()
    if git(root, "status", "--porcelain=v1", "--untracked-files=all"):
        raise Blocked("Working tree/index is dirty; review committed state in a clean worktree")
    for marker in ("MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"):
        path = git(root, "rev-parse", "--path-format=absolute", "--git-path", marker).decode().strip()
        if Path(path).exists():
            raise Blocked("Unfinished Git operation")

    def resolve(ref):
        if not text(ref) or ref.startswith("-"):
            raise Blocked("Invalid ref")
        return git(root, "rev-parse", "--verify", "--end-of-options", ref + "^{commit}").decode().strip()

    source = resolve(head)
    target = resolve(base) if base else None
    if mode == "diff" and target is None:
        raise Blocked("Diff review requires an existing target ref")
    ancestors = git(root, "merge-base", "--all", target, source).decode().split() if target else []
    if target and len(ancestors) != 1:
        raise Blocked("A single merge-base is required; review complex histories separately")
    ancestor = ancestors[0] if ancestors else None
    # Include both branches' integration-sensitive changes, not just source changes.
    if mode == "diff":
        delta = git(root, "diff", "--no-ext-diff", "--no-textconv", "--binary", ancestor, source, "--")
        target_delta = git(root, "diff", "--no-ext-diff", "--no-textconv", "--binary", ancestor, target, "--")
        files = git(root, "diff", "--name-only", "-z", ancestor, source, "--").split(b"\0")
        files += git(root, "diff", "--name-only", "-z", ancestor, target, "--").split(b"\0")
    else:
        delta = git(root, "rev-parse", source + "^{tree}")
        target_delta = b""
        files = git(root, "ls-tree", "-rz", "--name-only", source, "--").split(b"\0")
    return {
        "version": VERSION, "repo": str(root), "mode": mode,
        "source": source, "target": target, "merge_base": ancestor,
        "diff_sha256": hashlib.sha256(delta + b"\0" + target_delta).hexdigest(),
        "files": sorted({p.decode("utf-8", "surrogateescape") for p in files if p}),
    }


def validate(report, expected):
    if not isinstance(report, dict) or report.get("scope") != expected:
        raise Blocked("Report scope does not match current source/target")
    if not text(report.get("manual_review")):
        raise Blocked("Manual review evidence is required")
    coverage = report.get("coverage")
    if not isinstance(coverage, list) or len(coverage) != len(AREAS):
        raise Blocked("Coverage for all ten security areas is required")
    if any(not isinstance(item, dict) for item in coverage):
        raise Blocked("Invalid coverage entry")
    if {item.get("area") for item in coverage if isinstance(item.get("area"), str)} != AREAS:
        raise Blocked("Coverage areas must be A01 through A10 without duplicates")
    for item in coverage:
        if item.get("status") not in ("pass", "na") or not text(item.get("evidence")):
            raise Blocked("Each coverage area needs pass/na and evidence/reason")
    checks = report.get("checks")
    if not isinstance(checks, list) or not checks:
        raise Blocked("Executed checks and their applicability are required")
    for check in checks:
        if not isinstance(check, dict) or not text(check.get("name")) or not text(check.get("evidence")):
            raise Blocked("Invalid check/evidence")
        if type(check.get("required")) is not bool or check.get("status") not in ("pass", "fail", "not_run", "na"):
            raise Blocked("Invalid check status/required flag")
        if check["status"] == "fail" or (check["required"] and check["status"] != "pass"):
            raise Blocked("A check failed or a required check was not passed")
    findings = report.get("findings")
    if not isinstance(findings, list):
        raise Blocked("An explicit findings list is required")
    for finding in findings:
        if not isinstance(finding, dict):
            raise Blocked("Invalid finding")
        if any(not text(finding.get(key)) for key in ("id", "location", "evidence", "confidence")):
            raise Blocked("Finding identity, location, evidence and confidence are required")
        severity, disposition = finding.get("severity"), finding.get("disposition")
        if severity not in ("critical", "high", "medium", "low"):
            raise Blocked("Invalid severity")
        if disposition == "resolved" and text(finding.get("verification")):
            continue
        if severity in ("medium", "low") and disposition == "accepted" and text(finding.get("owner_acceptance")):
            continue
        raise Blocked("Unresolved finding or missing fix verification/owner acceptance")


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, value):
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Atomic replacement prevents a partially written receipt being treated as valid.
    temporary = destination.with_name(destination.name + ".tmp")
    with temporary.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=True, indent=2)
        stream.write("\n")
    temporary.replace(destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("scope", "record", "verify"))
    parser.add_argument("--repo", default=".")
    parser.add_argument("--base", help="Existing integration target, e.g. main")
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--mode", choices=("diff", "baseline"), default="diff")
    parser.add_argument("--report", help="Reviewer-authored JSON, required by record")
    parser.add_argument("--receipt", help="Local receipt outside tracked working tree")
    args = parser.parse_args()
    try:
        expected = scope(args.repo, args.base, args.head, args.mode)
        if args.command == "scope":
            print(json.dumps(expected, ensure_ascii=True, indent=2))
            return 0
        if not args.receipt:
            raise Blocked("--receipt is required")
        if args.command == "record":
            if not args.report:
                raise Blocked("--report is required")
            report = read_json(args.report)
            validate(report, expected)
            write_json(args.receipt, {"version": VERSION, "created_at": datetime.now(timezone.utc).isoformat(), "report": report})
        else:
            receipt = read_json(args.receipt)
            if not isinstance(receipt, dict) or receipt.get("version") != VERSION:
                raise Blocked("Unsupported receipt")
            validate(receipt.get("report"), expected)
        print("PASS: current commits match a complete non-blocking review; merge authorization is separate")
        return 0
    except (Blocked, OSError, ValueError, TypeError) as error:
        # Never echo untrusted JSON, Git stderr or secret-bearing paths.
        message = str(error) if isinstance(error, Blocked) else "Cannot read/write valid local review data"
        print("BLOCKED: " + message, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
