#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def replace_regex(path: Path, pattern: str, replacement: str) -> None:
    content = read_text(path)
    updated, count = re.subn(pattern, replacement, content, flags=re.MULTILINE)
    if count == 0:
        raise SystemExit(f"pattern not found in {path}: {pattern}")
    write_text(path, updated)


def update_package_json(path: Path, package_name: str, version: str, repo_url: str, wrapper_module_root: str) -> None:
    data = json.loads(read_text(path))
    data["name"] = package_name
    data["version"] = version
    data["repository"]["url"] = repo_url
    data["jsii"]["targets"]["go"]["moduleName"] = wrapper_module_root
    write_text(path, json.dumps(data, indent=2) + "\n")


def update_package_lock(path: Path, package_name: str, version: str) -> None:
    data = json.loads(read_text(path))
    data["name"] = package_name
    data["version"] = version
    if "packages" in data and "" in data["packages"]:
        data["packages"][""]["name"] = package_name
        data["packages"][""]["version"] = version
    write_text(path, json.dumps(data, indent=2) + "\n")


def run(cmd: list[str], cwd: Path) -> None:
    subprocess.run(cmd, cwd=cwd, check=True)


def sync_generated_wrapper(src: Path, dst: Path, package_name: str, version: str) -> None:
    if not src.exists():
        raise SystemExit(f"missing generated wrapper output: {src}")
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)

    jsii_dir = dst / "jsii"
    if jsii_dir.exists():
        keep = f"{package_name}-{version}.tgz"
        for tarball in jsii_dir.glob(f"{package_name}-*.tgz"):
            if tarball.name != keep:
                tarball.unlink()


def update_cdk_repo(
    repo: Path,
    package_name: str,
    version: str,
    source_repo_url: str,
    wrapper_repo_url: str,
    wrapper_module_root: str,
    wrapper_package_dir: str,
    terraform_repo_url: str,
) -> None:
    update_package_json(repo / "package.json", package_name, version, source_repo_url, wrapper_module_root)
    update_package_lock(repo / "package-lock.json", package_name, version)

    replace_regex(repo / "README.md", r"^# .+$", f"# {package_name}")
    replace_regex(repo / "README.md", r"https://github\.com/Bh-an/sc-cdk-[A-Za-z0-9-]+", source_repo_url)
    replace_regex(
        repo / "README.md",
        r"github\.com/Bh-an/sc-cdk-[A-Za-z0-9-]+/cdk[a-z0-9]+module",
        f"{wrapper_module_root}/{wrapper_package_dir}",
    )
    replace_regex(repo / "README.md", r"Current release line: `[^`]+`", f"Current release line: `{version}-dev`")

    replace_regex(repo / "docs" / "consumer-cicd.md", r"v\d+\.\d+\.\d+", f"v{version}")
    replace_regex(
        repo / "docs" / "consumer-cicd.md",
        r"https://github\.com/Bh-an/sc-tf-[A-Za-z0-9-]+",
        terraform_repo_url,
    )


def update_wrapper_repo(
    repo: Path,
    package_name: str,
    version: str,
    source_repo_url: str,
    wrapper_repo_url: str,
    wrapper_module_root: str,
    wrapper_package_dir: str,
    terraform_repo_url: str,
) -> None:
    replace_regex(repo / "README.md", r"^# .+$", f"# {package_name}-go")
    replace_regex(repo / "README.md", r"https://github\.com/Bh-an/sc-cdk-[A-Za-z0-9-]+", source_repo_url)
    replace_regex(
        repo / "README.md",
        r"github\.com/Bh-an/sc-cdk-[A-Za-z0-9-]+/cdk[a-z0-9]+module",
        f"{wrapper_module_root}/{wrapper_package_dir}",
    )
    replace_regex(repo / "README.md", r"`v\d+\.\d+\.\d+(?:-dev)?`", f"`v{version}`")
    replace_regex(repo / "README.md", r"cdk[a-z0-9]+module/", f"{wrapper_package_dir}/")
    replace_regex(repo / "README.md", r"https://github\.com/Bh-an/sc-tf-[A-Za-z0-9-]+", terraform_repo_url)


def update_service_repo(
    repo: Path,
    version: str,
    terraform_version: str,
    wrapper_module_root: str,
    wrapper_package_dir: str,
    terraform_repo_url: str,
    terraform_module_dir: str,
) -> None:
    wrapper_module = f"{wrapper_module_root}/{wrapper_package_dir}"

    replace_regex(
        repo / "README.md",
        r"github\.com/Bh-an/sc-cdk-[A-Za-z0-9-]+/cdk[a-z0-9]+module",
        wrapper_module,
    )
    replace_regex(repo / "README.md", r"https://github\.com/Bh-an/sc-tf-[A-Za-z0-9-]+", terraform_repo_url)
    replace_regex(
        repo / "README.md",
        r"shared `v\d+\.\d+\.\d+` CDK release line and the aligned Terraform `v\d+\.\d+\.\d+` release line",
        f"shared `v{version}` CDK release line and the aligned Terraform `v{terraform_version}` release line",
    )

    replace_regex(
        repo / "infra" / "cdk" / "README.md",
        r"`github\.com/Bh-an/sc-cdk-[A-Za-z0-9-]+/cdk[a-z0-9]+module v\d+\.\d+\.\d+`",
        f"`{wrapper_module} v{version}`",
    )
    replace_regex(
        repo / "infra" / "cdk" / "main.go",
        r'"github\.com/Bh-an/sc-cdk-[A-Za-z0-9-]+/cdk[a-z0-9]+module"',
        f'"{wrapper_module}"',
    )
    replace_regex(
        repo / "infra" / "cdk" / "go.mod",
        r"github\.com/Bh-an/sc-cdk-[A-Za-z0-9-]+/cdk[a-z0-9]+module v\d+\.\d+\.\d+",
        f"{wrapper_module} v{version}",
    )

    replace_regex(
        repo / "infra" / "terraform" / "README.md",
        r"https://github\.com/Bh-an/sc-tf-[A-Za-z0-9-]+\.git//terraform/modules/[A-Za-z0-9-]+\?ref=v\d+\.\d+\.\d+",
        f"{terraform_repo_url}.git//terraform/modules/{terraform_module_dir}?ref=v{terraform_version}",
    )
    replace_regex(
        repo / "infra" / "terraform" / "1_network.tf",
        r"https://github\.com/Bh-an/sc-tf-[A-Za-z0-9-]+\.git//terraform/modules/network\?ref=v\d+\.\d+\.\d+",
        f"{terraform_repo_url}.git//terraform/modules/network?ref=v{terraform_version}",
    )
    replace_regex(
        repo / "infra" / "terraform" / "2_service.tf",
        r"https://github\.com/Bh-an/sc-tf-[A-Za-z0-9-]+\.git//terraform/modules/[A-Za-z0-9-]+\?ref=v\d+\.\d+\.\d+",
        f"{terraform_repo_url}.git//terraform/modules/{terraform_module_dir}?ref=v{terraform_version}",
    )


def update_terraform_repo(repo: Path, repo_name: str, version: str, source_repo_url: str) -> None:
    replace_regex(repo / "README.md", r"^# .+$", f"# {repo_name}")
    replace_regex(
        repo / "README.md",
        r"`sc-tf-[A-Za-z0-9-]+` is the Terraform-side infrastructure repo",
        f"`{repo_name}` is the Terraform-side infrastructure repo",
    )
    replace_regex(repo / "README.md", r"https://github\.com/Bh-an/sc-cdk-[A-Za-z0-9-]+", source_repo_url)
    replace_regex(repo / "README.md", r"Current release line: `v\d+\.\d+\.\d+`", f"Current release line: `v{version}`")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-root", required=True)
    parser.add_argument("--cdk-version", required=True)
    parser.add_argument("--terraform-version", required=True)
    parser.add_argument("--cdk-package-name", default="cdk-service-host-module")
    parser.add_argument("--cdk-repo-name", default="sc-cdk-service-host-module")
    parser.add_argument("--wrapper-repo-name", default="sc-cdk-service-host-module-go")
    parser.add_argument("--wrapper-package-dir", default="cdkservicehostmodule")
    parser.add_argument("--terraform-repo-name", default="sc-tf-service-host-module")
    parser.add_argument("--terraform-module-dir", default="service-host")
    parser.add_argument("--service-repo-name", default="sc-ec2-go-service")
    parser.add_argument("--package-go", action="store_true")
    parser.add_argument("--sync-wrapper", action="store_true")
    args = parser.parse_args()

    root = Path(args.workspace_root).resolve()
    cdk_repo = root / args.cdk_repo_name
    wrapper_repo = root / args.wrapper_repo_name
    terraform_repo = root / args.terraform_repo_name
    service_repo = root / args.service_repo_name

    source_repo_url = f"https://github.com/Bh-an/{args.cdk_repo_name}"
    wrapper_repo_url = f"https://github.com/Bh-an/{args.wrapper_repo_name}"
    wrapper_module_root = f"github.com/Bh-an/{args.wrapper_repo_name}"
    terraform_repo_url = f"https://github.com/Bh-an/{args.terraform_repo_name}"

    update_cdk_repo(
        cdk_repo,
        args.cdk_package_name,
        args.cdk_version,
        source_repo_url,
        wrapper_repo_url,
        wrapper_module_root,
        args.wrapper_package_dir,
        terraform_repo_url,
    )
    update_wrapper_repo(
        wrapper_repo,
        args.cdk_package_name,
        args.cdk_version,
        source_repo_url,
        wrapper_repo_url,
        wrapper_module_root,
        args.wrapper_package_dir,
        terraform_repo_url,
    )
    update_service_repo(
        service_repo,
        args.cdk_version,
        args.terraform_version,
        wrapper_module_root,
        args.wrapper_package_dir,
        terraform_repo_url,
        args.terraform_module_dir,
    )
    update_terraform_repo(terraform_repo, args.terraform_repo_name, args.terraform_version, source_repo_url)

    if args.package_go:
        run(["npm", "run", "package:go"], cdk_repo)

    if args.sync_wrapper:
        sync_generated_wrapper(
            cdk_repo / "dist" / "go" / args.wrapper_package_dir,
            wrapper_repo / args.wrapper_package_dir,
            args.cdk_package_name,
            args.cdk_version,
        )


if __name__ == "__main__":
    main()
