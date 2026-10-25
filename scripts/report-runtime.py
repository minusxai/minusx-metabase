"""Keep full dependency results while excluding image environment and build history."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--image-id", type=Path, required=True)
parser.add_argument("--scan", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
parser.add_argument("--sources", nargs="+", required=True)
args = parser.parse_args()
raw = json.loads(args.scan.read_text())
metadata = raw["Metadata"]
image_id = args.image_id.read_text().strip()
assert image_id.startswith("sha256:") and len(image_id) == 71, "Invalid built image ID"
assert metadata["ImageID"] == image_id, "Scan does not describe the tested image"
checkout = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
report = {
    "source_head": os.environ["SOURCE_HEAD"],
    "checkout_sha": checkout,
    "source_hashes": {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in args.sources},
    "tested_image_id": image_id,
    "SchemaVersion": raw["SchemaVersion"],
    "ArtifactName": raw.get("ArtifactName"),
    "ArtifactType": raw.get("ArtifactType"),
    "Metadata": {key: metadata.get(key) for key in ("ImageID", "DiffIDs", "OS")},
    "Results": raw.get("Results", []),
    "coverage_limits": "All severity and unfixed scanner records retained; an absent fixed version does not establish no upstream fix. Custom runtime builds require source and test evidence alongside vendor release triage.",
}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2) + "\n")
