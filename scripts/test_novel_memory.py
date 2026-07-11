import contextlib
import importlib.util
import io
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT_PATH = Path(__file__).with_name("novel-memory.py")
SPEC = importlib.util.spec_from_file_location("novel_memory", SCRIPT_PATH)
novel_memory = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(novel_memory)


class NovelMemoryFactFilteringTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.original_palace_dir = novel_memory.PALACE_DIR
        novel_memory.PALACE_DIR = self.temp_dir.name
        self.addCleanup(setattr, novel_memory, "PALACE_DIR", self.original_palace_dir)

        conn = novel_memory.get_conn()
        try:
            novel_memory.init_db(conn)
        finally:
            conn.close()

    def read_facts(self):
        conn = sqlite3.connect(novel_memory.get_db_path())
        conn.row_factory = sqlite3.Row
        try:
            return [dict(row) for row in conn.execute(
                "SELECT * FROM facts ORDER BY rowid"
            ).fetchall()]
        finally:
            conn.close()

    def test_is_meaningful_fact_rejects_noise_and_keeps_named_entities(self):
        content = "江哲赶到临江市第一人民医院继续调查。"
        entities = [
            "他", "她", "它", "而", "但", "却", "又", "并", "且",
            "江哲", "临江市第一人民医院",
        ]

        decisions = [
            novel_memory.is_meaningful_fact(
                {"entity": entity, "attribute": "身份", "value": "调查对象"},
                content,
            )
            for entity in entities
        ]

        self.assertEqual(decisions, [False] * 9 + [True, True])

    def test_is_meaningful_fact_requires_complete_locatable_fields(self):
        content = "江哲正在调查。"

        self.assertFalse(novel_memory.is_meaningful_fact(
            {"entity": "江哲", "attribute": "  ", "value": "调查员"}, content
        ))
        self.assertFalse(novel_memory.is_meaningful_fact(
            {"entity": "江哲", "attribute": "身份", "value": "  "}, content
        ))
        self.assertFalse(novel_memory.is_meaningful_fact(
            {"entity": "顾明", "attribute": "身份", "value": "调查员"}, content
        ))
        self.assertTrue(novel_memory.is_meaningful_fact(
            {"entity": " 江哲 ", "attribute": " 身份 ", "value": " 调查员 "}, content
        ))

    def test_store_facts_filters_normalizes_deduplicates_and_reports_inserted_rows(self):
        content = "江哲赶到临江市第一人民医院继续调查。"
        extracted = [
            {"entity": "他", "attribute": "身份", "value": "调查员"},
            {"entity": "而", "attribute": "位置", "value": "医院"},
            {"entity": " 江哲 ", "attribute": " 身份 ", "value": " 调查员 "},
            {"entity": "江哲", "attribute": "身份", "value": "调查员"},
            {"entity": "临江市第一人民医院", "attribute": " 类型 ", "value": " 医院 "},
            {"entity": "顾明", "attribute": "身份", "value": "调查员"},
        ]

        stdout = io.StringIO()
        with patch.object(novel_memory, "extract_facts", return_value=extracted):
            with contextlib.redirect_stdout(stdout):
                stored_ids = novel_memory.store_facts(7, content, chapter_no=11)

        payload = json.loads(stdout.getvalue())
        rows = self.read_facts()

        self.assertEqual(len(stored_ids), 2)
        self.assertEqual(payload["count"], 2)
        self.assertEqual(payload["facts"], [
            {"id": stored_ids[0], "entity": "江哲", "attribute": "身份", "value": "调查员"},
            {"id": stored_ids[1], "entity": "临江市第一人民医院", "attribute": "类型", "value": "医院"},
        ])
        self.assertEqual(
            [(row["entity"], row["attribute"], row["value"], row["chapter_from"]) for row in rows],
            [
                ("江哲", "身份", "调查员", 11),
                ("临江市第一人民医院", "类型", "医院", 11),
            ],
        )

    def test_store_facts_does_not_modify_historical_rows(self):
        conn = novel_memory.get_conn()
        try:
            conn.execute(
                "INSERT INTO facts (id, project_id, entity, attribute, value) VALUES (?, ?, ?, ?, ?)",
                ("historical", 7, "他", "身份", "旧事实"),
            )
            conn.commit()
        finally:
            conn.close()

        extracted = [
            {"entity": "他", "attribute": "身份", "value": "新事实"},
            {"entity": "江哲", "attribute": "身份", "value": "调查员"},
        ]
        with patch.object(novel_memory, "extract_facts", return_value=extracted):
            with contextlib.redirect_stdout(io.StringIO()):
                novel_memory.store_facts(7, "江哲正在调查。")

        rows = self.read_facts()
        self.assertEqual(len(rows), 2)
        self.assertEqual(
            (rows[0]["id"], rows[0]["entity"], rows[0]["value"]),
            ("historical", "他", "旧事实"),
        )
        self.assertNotEqual(rows[1]["id"], "historical")
        self.assertEqual((rows[1]["entity"], rows[1]["value"]), ("江哲", "调查员"))


if __name__ == "__main__":
    unittest.main()
