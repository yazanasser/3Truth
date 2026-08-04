#!/usr/bin/env python3
"""Build a balanced Arabic human/AI JSONL corpus from public research data."""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from datasets import DatasetDict, load_dataset


LOGGER = logging.getLogger("prepare_arabic_detection_dataset")
ARABIC_CHARACTER = re.compile(r"[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]")
SPACE = re.compile(r"\s+")

# Revisions are pinned so rebuilding does not silently change the corpus.
SOURCES = (
    {
        "id": "KFUPM-JRCAI/arabic-generated-social-media-posts",
        "revision": "61c951aecfd0eb1a00de75b768078e5e6a57fafc",
        "human_column": "original_post",
        "generated_suffix": "_generated_post",
        "domain": "social_media_reviews",
        "url": "https://huggingface.co/datasets/KFUPM-JRCAI/arabic-generated-social-media-posts",
        "license": "not specified in the Hugging Face dataset card",
    },
    {
        "id": "KFUPM-JRCAI/arabic-generated-abstracts",
        "revision": "584e43a346914a4cb1a51f9679f903284b65c36e",
        "human_column": "original_abstract",
        "generated_suffix": "_generated_abstract",
        "domain": "academic_abstracts",
        "url": "https://huggingface.co/datasets/KFUPM-JRCAI/arabic-generated-abstracts",
        "license": "not specified in the Hugging Face dataset card",
    },
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare real paired Arabic human/AI training records."
    )
    parser.add_argument("--output", type=Path, default=Path("data/train.jsonl"))
    parser.add_argument(
        "--manifest", type=Path, default=Path("data/DATASET_MANIFEST.json")
    )
    parser.add_argument(
        "--cache-dir", type=Path, default=Path("data/huggingface_cache")
    )
    parser.add_argument("--minimum-characters", type=int, default=80)
    parser.add_argument("--minimum-arabic-characters", type=int, default=30)
    parser.add_argument("--minimum-arabic-ratio", type=float, default=0.25)
    parser.add_argument(
        "--max-pairs",
        type=int,
        default=None,
        help="Optional deterministic pair limit for smoke tests.",
    )
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def normalize_text(value: Any) -> str:
    return SPACE.sub(" ", str(value or "")).strip()


def text_is_usable(
    text: str,
    minimum_characters: int,
    minimum_arabic_characters: int,
    minimum_arabic_ratio: float,
) -> bool:
    if len(text) < minimum_characters:
        return False
    letters = [character for character in text if character.isalpha()]
    arabic_count = len(ARABIC_CHARACTER.findall(text))
    ratio = arabic_count / max(len(letters), 1)
    return arabic_count >= minimum_arabic_characters and ratio >= minimum_arabic_ratio


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def iter_splits(loaded: Any) -> list[tuple[str, Any]]:
    if isinstance(loaded, DatasetDict):
        return sorted(loaded.items())
    return [("train", loaded)]


def collect_pairs(args: argparse.Namespace) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    human_by_hash: dict[str, dict[str, str]] = {}
    generated_by_human: dict[str, list[dict[str, str]]] = defaultdict(list)
    rejected = Counter()
    raw_rows = Counter()

    for source in SOURCES:
        LOGGER.info("Downloading/loading %s at %s.", source["id"], source["revision"])
        loaded = load_dataset(
            source["id"],
            revision=source["revision"],
            cache_dir=str(args.cache_dir.resolve()),
        )
        for split_name, split in iter_splits(loaded):
            LOGGER.info("Reading %s/%s (%d rows).", source["id"], split_name, len(split))
            for row in split:
                raw_rows[source["id"]] += 1
                human = normalize_text(row.get(source["human_column"]))
                if not text_is_usable(
                    human,
                    args.minimum_characters,
                    args.minimum_arabic_characters,
                    args.minimum_arabic_ratio,
                ):
                    rejected["human_content_filter"] += 1
                    continue

                human_hash = text_hash(human)
                human_by_hash.setdefault(
                    human_hash,
                    {
                        "text": human,
                        "source_dataset": source["id"],
                        "domain": source["domain"],
                    },
                )

                generated_columns = sorted(
                    column
                    for column in split.column_names
                    if column.endswith(source["generated_suffix"])
                )
                for column in generated_columns:
                    generated = normalize_text(row.get(column))
                    if generated == human:
                        rejected["generated_equals_human"] += 1
                        continue
                    if not text_is_usable(
                        generated,
                        args.minimum_characters,
                        args.minimum_arabic_characters,
                        args.minimum_arabic_ratio,
                    ):
                        rejected["generated_content_filter"] += 1
                        continue
                    generator = column.removesuffix(source["generated_suffix"])
                    generated_by_human[human_hash].append(
                        {
                            "text": generated,
                            "generator": generator,
                            "generation_method": split_name,
                            "source_dataset": source["id"],
                            "domain": source["domain"],
                        }
                    )

    records: list[dict[str, Any]] = []
    seen_texts: set[str] = set()
    selected_generators = Counter()
    selected_methods = Counter()
    eligible_hashes = sorted(
        human_hash for human_hash in human_by_hash if generated_by_human.get(human_hash)
    )
    if args.max_pairs is not None:
        eligible_hashes = eligible_hashes[: args.max_pairs]

    for human_hash in eligible_hashes:
        human = human_by_hash[human_hash]
        candidates = sorted(
            generated_by_human[human_hash],
            key=lambda item: (
                item["generator"],
                item["generation_method"],
                text_hash(item["text"]),
            ),
        )
        selection_index = int(human_hash[:16], 16) % len(candidates)
        generated = candidates[selection_index]
        human_text_hash = text_hash(human["text"])
        generated_text_hash = text_hash(generated["text"])
        if human_text_hash in seen_texts or generated_text_hash in seen_texts:
            rejected["global_duplicate"] += 1
            continue
        seen_texts.update((human_text_hash, generated_text_hash))

        group = f"paired:{human_hash[:24]}"
        records.extend(
            (
                {
                    "text": human["text"],
                    "label": 0,
                    "group": group,
                    "source": human["source_dataset"],
                    "domain": human["domain"],
                    "generator": "human",
                    "generation_method": "original",
                },
                {
                    "text": generated["text"],
                    "label": 1,
                    "group": group,
                    "source": generated["source_dataset"],
                    "domain": generated["domain"],
                    "generator": generated["generator"],
                    "generation_method": generated["generation_method"],
                },
            )
        )
        selected_generators[generated["generator"]] += 1
        selected_methods[generated["generation_method"]] += 1

    if not records:
        raise RuntimeError("No valid paired records were produced from the source datasets.")

    metadata = {
        "raw_source_rows": dict(raw_rows),
        "rejected": dict(rejected),
        "selected_generators": dict(selected_generators),
        "selected_generation_methods": dict(selected_methods),
    }
    return records, metadata


def atomic_write_jsonl(records: list[dict[str, Any]], path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    digest = hashlib.sha256()
    with temporary.open("w", encoding="utf-8", newline="\n") as handle:
        for record in records:
            encoded = (json.dumps(record, ensure_ascii=False) + "\n").encode("utf-8")
            handle.write(encoded.decode("utf-8"))
            digest.update(encoded)
    temporary.replace(path)
    return digest.hexdigest()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    args = parse_args()
    output = args.output.resolve()
    manifest_path = args.manifest.resolve()
    if output.exists() and output.stat().st_size > 0 and not args.overwrite:
        raise FileExistsError(f"Refusing to replace non-empty {output}; pass --overwrite.")

    records, collection_metadata = collect_pairs(args)
    output_sha256 = atomic_write_jsonl(records, output)
    label_counts = Counter(record["label"] for record in records)
    manifest = {
        "schema_version": 1,
        "purpose": "Arabic human versus AI-generated text detection research",
        "output": str(output),
        "output_sha256": output_sha256,
        "records": len(records),
        "pairs": len(records) // 2,
        "label_counts": {"human": label_counts[0], "ai": label_counts[1]},
        "construction": (
            "One original human text and one deterministic generated candidate per "
            "source text. Paired records share a group to prevent split leakage."
        ),
        "content_filters": {
            "minimum_characters": args.minimum_characters,
            "minimum_arabic_characters": args.minimum_arabic_characters,
            "minimum_arabic_ratio": args.minimum_arabic_ratio,
        },
        "sources": list(SOURCES),
        "licensing_notice": (
            "The source dataset cards did not specify an SPDX license when this "
            "manifest was generated. Treat this corpus as research-only unless the "
            "source owners provide terms suitable for the intended deployment."
        ),
        **collection_metadata,
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    LOGGER.info(
        "Wrote %d balanced records (%d pairs) to %s.",
        len(records),
        len(records) // 2,
        output,
    )
    LOGGER.info("Provenance manifest: %s", manifest_path)


if __name__ == "__main__":
    main()
