#!/usr/bin/env python3
"""Fetch the public CodaBench leaderboard and write the website JSON asset."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin
from urllib.request import Request, urlopen


CODABENCH_BASE_URL = "https://www.codabench.org"
COMPETITION_ID = 16752
DEFAULT_PHASE_ID = 27428
SOURCE_URL = f"{CODABENCH_BASE_URL}/competitions/{COMPETITION_ID}/#/results-tab"
COMPETITION_API_URL = f"{CODABENCH_BASE_URL}/api/competitions/{COMPETITION_ID}/"


def leaderboard_api_url(phase_id: int) -> str:
    return (
        f"{CODABENCH_BASE_URL}/api/phases/{phase_id}/get_leaderboard/"
        "?page=1&page_size=all"
    )


def fetch_json(url: str) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "MoCha-workshop-leaderboard-updater/1.0",
        },
    )

    with urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def absolute_url(url: str | None) -> str | None:
    if not url:
        return None

    return urljoin(CODABENCH_BASE_URL, url)


def current_phase_id(competition: dict[str, Any]) -> int:
    phases = competition.get("phases", [])
    for phase in phases:
        if phase.get("status") == "Current" and phase.get("id"):
            return int(phase["id"])

    if phases and phases[0].get("id"):
        return int(phases[0]["id"])

    return DEFAULT_PHASE_ID


def normalize_leaderboard(
    raw: dict[str, Any],
    api_url: str,
    phase_id: int,
) -> dict[str, Any]:
    columns: list[dict[str, Any]] = []
    for task in raw.get("tasks", []):
        for column in task.get("columns", []):
            if column.get("hidden"):
                continue

            columns.append(
                {
                    "key": column.get("key"),
                    "title": column.get("title"),
                    "precision": column.get("precision", 2),
                    "sorting": column.get("sorting"),
                    "primary": column.get("index") == raw.get("primary_index"),
                }
            )

    entries: list[dict[str, Any]] = []
    for rank, submission in enumerate(raw.get("submissions", []), start=1):
        organization = submission.get("organization") or {}
        scores = {
            score.get("column_key"): score.get("score")
            for score in submission.get("scores", [])
            if score.get("column_key")
        }

        entries.append(
            {
                "rank": rank,
                "participant": submission.get("owner") or "Anonymous",
                "participant_url": absolute_url(submission.get("slug_url")),
                "organization": organization.get("name"),
                "organization_url": absolute_url(organization.get("url")),
                "submission_id": submission.get("id"),
                "submitted_at": submission.get("created_when"),
                "scores": scores,
            }
        )

    return {
        "source": SOURCE_URL,
        "api_url": api_url,
        "competition_id": COMPETITION_ID,
        "phase_id": raw.get("id", phase_id),
        "title": raw.get("title", "Results"),
        "fetched_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "total_entries": raw.get("count", len(entries)),
        "columns": columns,
        "entries": entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Update assets/leaderboard.json from the public CodaBench leaderboard."
    )
    parser.add_argument(
        "--output",
        default="assets/leaderboard.json",
        help="Path to write the normalized leaderboard JSON.",
    )
    args = parser.parse_args()

    competition = fetch_json(COMPETITION_API_URL)
    phase_id = current_phase_id(competition)
    api_url = leaderboard_api_url(phase_id)
    raw = fetch_json(api_url)
    normalized = normalize_leaderboard(raw, api_url, phase_id)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(normalized, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {len(normalized['entries'])} leaderboard entries to {output_path}"
    )


if __name__ == "__main__":
    main()
