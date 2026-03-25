#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path


GO_WRAPPER_MODULE = "github.com/Bh-an/sc-cdk-ec2-service-module-go/cdkec2servicemodule"
GO_WRAPPER_REPO = "github.com/Bh-an/sc-cdk-ec2-service-module-go"


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def replace_regex(path: Path, pattern: str, replacement: str) -> None:
    content = path.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, replacement, content, flags=re.MULTILINE)
    if count == 0:
        raise SystemExit(f"pattern not found in {path}: {pattern}")
    write_text(path, updated)


def replace_literal(path: Path, old: str, new: str) -> None:
    content = path.read_text(encoding="utf-8")
    if old not in content:
        raise SystemExit(f"literal not found in {path}: {old}")
    write_text(path, content.replace(old, new))


def update_json_version(path: Path, version: str) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    data["version"] = version
    if "packages" in data and "" in data["packages"]:
        data["packages"][""]["version"] = version
    write_text(path, json.dumps(data, indent=2) + "\n")


def run(cmd: list[str], cwd: Path) -> None:
    subprocess.run(cmd, cwd=cwd, check=True)


def sync_tree(src: Path, dst: Path, cdk_version: str) -> None:
    if not src.exists():
        raise SystemExit(f"missing generated wrapper output: {src}")
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    jsii_dir = dst / "jsii"
    if jsii_dir.exists():
        for tarball in jsii_dir.glob("cdk-ec2-service-module-*.tgz"):
            if tarball.name != f"cdk-ec2-service-module-{cdk_version}.tgz":
                tarball.unlink()


def update_cdk_repo(repo: Path, cdk_version: str) -> None:
    update_json_version(repo / "package.json", cdk_version)
    update_json_version(repo / "package-lock.json", cdk_version)
    replace_regex(
        repo / "README.md",
        r"Current release line: `[^`]+`",
        f"Current release line: `{cdk_version}`",
    )
    replace_regex(
        repo / "docs" / "consumer-cicd.md",
        r"`v\d+\.\d+\.\d+` contract",
        f"`v{cdk_version}` contract",
    )


def update_wrapper_repo(repo: Path, cdk_version: str) -> None:
    replace_regex(
        repo / "README.md",
        r"github\.com/Bh-an/[A-Za-z0-9-]+/cdkec2servicemodule",
        GO_WRAPPER_MODULE,
    )
    replace_regex(
        repo / "README.md",
        r"`v\d+\.\d+\.\d+(?:-dev)?`",
        f"`v{cdk_version}`",
    )


def update_service_repo(repo: Path, cdk_version: str, terraform_version: str) -> None:
    replace_regex(
        repo / "README.md",
        r"github\.com/Bh-an/[A-Za-z0-9-]+/cdkec2servicemodule",
        GO_WRAPPER_MODULE,
    )
    replace_regex(
        repo / "README.md",
        r"shared `v\d+\.\d+\.\d+` CDK release line and the aligned Terraform `v\d+\.\d+\.\d+` release line",
        f"shared `v{cdk_version}` CDK release line and the aligned Terraform `v{terraform_version}` release line",
    )
    replace_regex(
        repo / "infra" / "cdk" / "README.md",
        r"`github\.com/Bh-an/[A-Za-z0-9-]+/cdkec2servicemodule v\d+\.\d+\.\d+`",
        f"`{GO_WRAPPER_MODULE} v{cdk_version}`",
    )
    replace_regex(
        repo / "infra" / "cdk" / "main.go",
        r'"github\.com/Bh-an/[A-Za-z0-9-]+/cdkec2servicemodule"',
        f'"{GO_WRAPPER_MODULE}"',
    )
    replace_regex(
        repo / "infra" / "cdk" / "go.mod",
        r"github\.com/Bh-an/[A-Za-z0-9-]+/cdkec2servicemodule v\d+\.\d+\.\d+",
        f"{GO_WRAPPER_MODULE} v{cdk_version}",
    )
    replace_regex(
        repo / "infra" / "terraform" / "README.md",
        r"ref=v\d+\.\d+\.\d+",
        f"ref=v{terraform_version}",
    )
    replace_regex(
        repo / "infra" / "terraform" / "1_network.tf",
        r"ref=v\d+\.\d+\.\d+",
        f"ref=v{terraform_version}",
    )
    replace_regex(
        repo / "infra" / "terraform" / "2_service.tf",
        r"ref=v\d+\.\d+\.\d+",
        f"ref=v{terraform_version}",
    )


def update_terraform_repo(repo: Path, terraform_version: str) -> None:
    replace_regex(
        repo / "README.md",
        r"Current release line: `v\d+\.\d+\.\d+`",
        f"Current release line: `v{terraform_version}`",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-root", required=True)
    parser.add_argument("--cdk-version", required=True)
    parser.add_argument("--terraform-version", required=True)
    parser.add_argument("--package-go", action="store_true")
    parser.add_argument("--sync-wrapper", action="store_true")
    args = parser.parse_args()

    root = Path(args.workspace_root).resolve()
    cdk_repo = root / "sc-cdk-ec2-service-module"
    wrapper_repo = root / "sc-cdk-ec2-service-module-go"
    terraform_repo = root / "sc-tf-ec2-service-module"
    service_repo = root / "sc-ec2-go-service"

    update_cdk_repo(cdk_repo, args.cdk_version)
    update_wrapper_repo(wrapper_repo, args.cdk_version)
    update_service_repo(service_repo, args.cdk_version, args.terraform_version)
    update_terraform_repo(terraform_repo, args.terraform_version)

    if args.package_go:
        run(["npm", "run", "package:go"], cdk_repo)
    if args.sync_wrapper:
        sync_tree(
            cdk_repo / "dist" / "go" / "cdkec2servicemodule",
            wrapper_repo / "cdkec2servicemodule",
            args.cdk_version,
        )


if __name__ == "__main__":
    main()
