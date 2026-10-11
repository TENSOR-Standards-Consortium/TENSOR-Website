#!/usr/bin/env python3
"""Limited consistency check for these illustrative files; not Core conformance."""

from hashlib import sha256
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CORE_REFS = {
    "actorId": "Actor",
    "issuerId": "Actor",
    "granteeId": "Actor",
    "targetInstanceId": "QuestionInstance",
    "relatedInstanceId": "QuestionInstance",
    "selectedAssessmentId": "Assessment",
    "originDecisionId": "Decision",
    "decisionId": "Decision",
    "evidenceRefIds": "EvidenceReference",
    "policyRefIds": "PolicyReference",
    "authorityRefIds": "AuthorityAssertion",
    "classificationPolicy": "PolicyReference",
    "entryId": None,
    "basisReferences": None,
    "selectedInputIds": None,
    "reviewedEntryIds": None,
    "triggeringEntryIds": None,
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from objects(child)


def check_case(tag):
    definition_bytes = (ROOT / f"{tag}.definition.json").read_bytes()
    definition = json.loads(definition_bytes.decode("utf-8"))
    record = json.loads((ROOT / f"{tag}.record.json").read_text("utf-8"))
    entries = {entry["id"]: entry for entry in record["entries"]}
    questions = {question["id"]: question for question in definition["questions"]}
    transitions = {transition["id"]: transition for transition in definition["transitions"]}
    require(len(entries) == len(record["entries"]), f"{tag}: duplicate entry ID")
    all_ids = [definition["id"], record["investigationId"], record["snapshotId"]]
    all_ids += list(entries) + [q["id"] for q in definition["questions"]]
    all_ids += [t["id"] for t in definition["transitions"]]
    require(len(set(all_ids)) == len(all_ids), f"{tag}: reused identity")
    require(record["contractRef"]["proposal"] == "0.1.0", f"{tag}: unexpected proposal")
    require(definition["contractRef"] == record["contractRef"], f"{tag}: contract mismatch")
    for reference in record["definitionReferences"]:
        require(reference["id"] == definition["id"], f"{tag}: definition ID mismatch")
        require(reference["version"] == definition["version"], f"{tag}: version mismatch")
        require(reference["sha256"] == sha256(definition_bytes).hexdigest(), f"{tag}: pinned byte mismatch")
    pinned = record["definitionReferences"][0]
    for entry in entries.values():
        require("recordedAt" in entry and "attribution" in entry, f"{tag}: missing generic entry fields")
        if entry["type"] == "QuestionInstance":
            require(entry["definitionRef"] == pinned, f"{tag}: instance pin mismatch")
            require(entry["questionId"] in questions, f"{tag}: unknown question")
            parameters = questions[entry["questionId"]]["parameters"]
            for name, declaration in parameters.items():
                if declaration["required"]:
                    require(name in entry["parameterBindings"], f"{tag}: missing required binding {name}")
            if "organization" in parameters:
                require(entry["parameterBindings"]["organization"] == record["scope"].get("organization"),
                        f"{tag}: organization binding differs from record scope")
        if entry["type"] == "Assessment" and entry.get("outcome") == "unknown":
            require(bool(entry.get("unknownReasons")), f"{tag}: missing unknown reason")
    for obj in objects(record):
        for key, value in obj.items():
            if key in CORE_REFS:
                for reference in value if isinstance(value, list) else [value]:
                    require(reference in entries, f"{tag}: unresolved {key}: {reference}")
                    expected = CORE_REFS[key]
                    require(expected is None or entries[reference]["type"] == expected, f"{tag}: wrong reference type for {key}")
            if key == "targetInvestigationId":
                require(value == record["investigationId"], f"{tag}: wrong investigation")
    for qid in definition["entryQuestionIds"]:
        require(qid in questions, f"{tag}: unknown entry question")
    for transition in transitions.values():
        require(transition["sourceQuestionId"] in questions and transition["targetQuestionId"] in questions,
                f"{tag}: unresolved definition transition")
    for decision in entries.values():
        if decision["type"] != "Decision" or decision["disposition"] != "transition":
            continue
        source = entries[decision["targetInstanceId"]]
        assessment = entries[decision["selectedAssessmentId"]]
        require(assessment["targetInstanceId"] == source["id"], f"{tag}: assessment targets wrong instance")
        require(assessment["applicability"]["status"] == "applicable", f"{tag}: guard used with unresolved applicability")
        require(bool(decision["selections"]), f"{tag}: empty transition selection")
        for selection in decision["selections"]:
            transition = transitions[selection["transitionId"]]
            target = entries[selection["targetInstanceId"]]
            require(transition["sourceQuestionId"] == source["questionId"], f"{tag}: wrong transition source")
            require(transition["targetQuestionId"] == target["questionId"], f"{tag}: wrong transition target")
            require(transition["guardOutcome"] == assessment["outcome"], f"{tag}: guard mismatch")
            require(source["definitionRef"] == target["definitionRef"], f"{tag}: cross-definition transition")
            require(target["origin"]["originDecisionId"] == decision["id"], f"{tag}: wrong target origin")
    for entry in entries.values():
        seen = set()
        current = entry
        while "supersedes" in current:
            require(current["id"] not in seen, f"{tag}: revision cycle")
            seen.add(current["id"])
            ancestor = entries[current["supersedes"]["entryId"]]
            require(ancestor["type"] == current["type"], f"{tag}: cross-type revision")
            current = ancestor
    return len(entries)


def main():
    manifest = json.loads((ROOT / "manifest.json").read_text("utf-8"))
    expected_files = {f"{tag}.{kind}.json" for tag in ("case-a", "case-b") for kind in ("definition", "record")}
    require({item["file"] for item in manifest["artifacts"]} == expected_files, "Manifest file set differs")
    for item in manifest["artifacts"]:
        require(sha256((ROOT / item["file"]).read_bytes()).hexdigest() == item["sha256"], f"Manifest byte mismatch: {item['file']}")
    counts = [check_case(tag) for tag in ("case-a", "case-b")]
    print(f"PASS limited authoring checks: 4 JSON artifacts; record entries {counts}; manifest, pins, references, transition wiring, and revision links.")
    print("NOT CHECKED: complete Core requirements, evidence truth, security, execution, or independent interoperability. C01-C12 remain notRun.")


if __name__ == "__main__":
    main()
